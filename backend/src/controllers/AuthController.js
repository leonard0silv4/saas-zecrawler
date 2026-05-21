import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { PLANS } from "../../config/plans.js";
import { computeAccess, loadTeamPermissions } from "../utils/access.js";

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
