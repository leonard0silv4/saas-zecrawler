import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { PLANS } from "../../config/plans.js";
import { computeAccess, loadTeamPermissions } from "../utils/access.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

export default {
  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, senha e nome são obrigatórios" });
      }

      const exists = await User.findOne({ email });
      if (exists) return res.status(409).json({ error: "Email já cadastrado" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        email,
        password: hashedPassword,
        name,
        plan: "free",
      });

      const token = generateToken(user);

      return res.status(201).json({
        token,
        user: await sanitizeUser(user, user),
      });
    } catch (err) {
      console.error("Erro no registro:", err);
      return res.status(500).json({ error: "Erro ao registrar" });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

      const token = generateToken(user);

      const ownerDoc = await loadOwnerDoc(user);
      return res.json({
        token,
        user: await sanitizeUser(user, ownerDoc),
      });
    } catch (err) {
      console.error("Erro no login:", err);
      return res.status(500).json({ error: "Erro no login" });
    }
  },

  async me(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

      const ownerDoc = await loadOwnerDoc(user);
      return res.json({ user: await sanitizeUser(user, ownerDoc) });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao buscar perfil" });
    }
  },

  async updatePlan(req, res) {
    // Plan changes are now managed by Stripe.
    // This endpoint only allows downgrade to free (cancel).
    try {
      const { plan } = req.body;
      if (plan !== "free") {
        return res.status(400).json({ error: "Use /api/stripe/checkout para alterar plano pago" });
      }

      const user = await User.findById(req.user.id);
      user.plan = "free";
      user.planExpiresAt = null;
      await user.save();

      const ownerDoc = await loadOwnerDoc(user);
      return res.json({ user: await sanitizeUser(user, ownerDoc) });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao atualizar plano" });
    }
  },

  async getPlans(req, res) {
    return res.json(PLANS);
  },

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email é obrigatório" });

      // Sempre retorna 200 para não revelar se o email existe
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) return res.json({ message: "Se o email estiver cadastrado, você receberá o link em breve." });

      // Gera token aleatório e salva hash no banco
      const tokenPlain = crypto.randomBytes(32).toString("hex");
      const tokenHash  = crypto.createHash("sha256").update(tokenPlain).digest("hex");

      user.resetToken          = tokenHash;
      user.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      await user.save();

      await sendPasswordResetEmail(user.email, tokenPlain);

      return res.json({ message: "Se o email estiver cadastrado, você receberá o link em breve." });
    } catch (err) {
      console.error("Erro em forgotPassword:", err);
      return res.status(500).json({ error: "Erro ao processar solicitação" });
    }
  },

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token e nova senha são obrigatórios" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const user = await User.findOne({
        resetToken: tokenHash,
        resetTokenExpiresAt: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({ error: "Token inválido ou expirado" });
      }

      user.password            = await bcrypt.hash(newPassword, 10);
      user.resetToken          = null;
      user.resetTokenExpiresAt = null;
      await user.save();

      return res.json({ message: "Senha atualizada com sucesso" });
    } catch (err) {
      console.error("Erro em resetPassword:", err);
      return res.status(500).json({ error: "Erro ao redefinir senha" });
    }
  },
};

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.SECRET,
    { expiresIn: "30d" }
  );
}

async function loadOwnerDoc(user) {
  const u = user.toJSON ? user.toJSON() : user;
  if (u.role === "owner") return user;
  if (!u.ownerId) return user;
  return User.findById(u.ownerId);
}

async function sanitizeUser(user, ownerDoc = null) {
  const obj = user.toJSON ? user.toJSON() : user;
  const { password, ...rest } = obj;
  const ownerPlain = ownerDoc
    ? ownerDoc.toJSON
      ? ownerDoc.toJSON()
      : ownerDoc
    : obj;

  const teamPerms = await loadTeamPermissions(obj);
  const { effectivePlan, allowedModules, planModules } = computeAccess(
    obj,
    obj.role === "owner" ? obj : ownerPlain,
    teamPerms
  );

  const ownerForStripe = obj.role === "owner" ? obj : ownerPlain;
  return {
    ...rest,
    effectivePlan,
    allowedModules,
    planModules,
    planConfig: PLANS[effectivePlan],
    hasSubscription: !!ownerForStripe.stripeSubscriptionId,
  };
}
