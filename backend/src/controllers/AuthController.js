import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import User from "../models/User.js";
import Team from "../models/Team.js";
import Link from "../models/Link.js";
import Conta from "../models/Conta.js";
import Cookie from "../models/Cookie.js";
import MeliQuestion from "../models/MeliQuestion.js";
import MeliProduct from "../models/MeliProduct.js";
import MeliMessageTemplate from "../models/MeliMessageTemplate.js";
import CatalogProduct from "../models/CatalogProduct.js";
import Nf from "../models/Nf.js";
import PriceAnalyzeSnapshot from "../models/PriceAnalyzeSnapshot.js";
import SellerPage from "../models/SellerPage.js";
import SellerProduct from "../models/SellerProduct.js";
import SellerAlert from "../models/SellerAlert.js";
import { ExpedicaoRegistro, ExpedicaoMeta, ExpedicaoDiaEncerrado } from "../models/Expedicao.js";
import { PLANS, MODULES } from "../../config/plans.js";
import { computeAccess, loadTeamPermissions } from "../utils/access.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    return res.json({ plans: PLANS, modules: MODULES });
  },

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email é obrigatório" });

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(404).json({
          error: "email_not_found",
          message: "Nenhuma conta foi encontrada com este e-mail.",
        });
      }

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

  async deleteAccount(req, res) {
    try {
      if (req.user.role !== "owner") {
        return res.status(403).json({ error: "Apenas o proprietário pode encerrar a conta." });
      }

      const ownerId = req.user.id;
      const user = await User.findById(ownerId);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

      // 1. Cancelar assinatura Stripe imediatamente
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        } catch (stripeErr) {
          console.warn("Aviso: erro ao cancelar assinatura Stripe:", stripeErr.message);
        }
      }
      // Remover customer Stripe (GDPR / limpeza)
      if (user.stripeCustomerId) {
        try {
          await stripe.customers.del(user.stripeCustomerId);
        } catch {
          // ignora se customer não existir mais
        }
      }

      // 2. SellerMonitor: SellerPages → SellerProducts + SellerAlerts (cascata manual)
      const sellerPages = await SellerPage.find({ ownerId }).select("_id");
      const sellerPageIds = sellerPages.map((sp) => sp._id);
      if (sellerPageIds.length > 0) {
        await SellerAlert.deleteMany({ sellerId: { $in: sellerPageIds } });
        await SellerProduct.deleteMany({ sellerId: { $in: sellerPageIds } });
      }
      await SellerPage.deleteMany({ ownerId });

      // 3. Dados MercadoLibre
      await MeliQuestion.deleteMany({ ownerId });
      await MeliProduct.deleteMany({ ownerId });
      await MeliMessageTemplate.deleteMany({ ownerId });
      await Conta.deleteMany({ ownerId });

      // 4. Demais dados do owner
      await Link.deleteMany({ ownerId });
      await Cookie.deleteMany({ ownerId });
      await CatalogProduct.deleteMany({ ownerId });
      await Nf.deleteMany({ ownerId });
      await PriceAnalyzeSnapshot.deleteMany({ ownerId });
      await ExpedicaoRegistro.deleteMany({ ownerId });
      await ExpedicaoMeta.deleteMany({ ownerId });
      await ExpedicaoDiaEncerrado.deleteMany({ ownerId });

      // 5. Sub-usuários e times
      await User.deleteMany({ ownerId });
      await Team.deleteMany({ ownerId });

      // 6. Owner (por último)
      await User.findByIdAndDelete(ownerId);

      return res.json({ message: "Conta encerrada com sucesso." });
    } catch (err) {
      console.error("Erro ao encerrar conta:", err);
      return res.status(500).json({ error: "Erro ao encerrar conta. Tente novamente." });
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
  const {
    password,
    resetToken,
    resetTokenExpiresAt,
    stripeCustomerId,
    stripeSubscriptionId,
    stripeSubscriptionStatus,
    __v,
    ...rest
  } = obj;
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
