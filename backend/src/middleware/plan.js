import { PLANS, MODULES } from "../../config/plans.js";
import Link from "../models/Link.js";
import SellerPage from "../models/SellerPage.js";
import User from "../models/User.js";
import Team from "../models/Team.js";

/**
 * Checks if user's plan allows access to a specific module.
 */
export function requireModule(moduleName) {
  return (req, res, next) => {
    const mod = MODULES[moduleName];
    if (!mod) return res.status(500).json({ error: "Módulo inválido" });

    const allowed = req.user.allowedModules || [];
    if (!allowed.includes(moduleName)) {
      return res.status(403).json({
        error: "Módulo não disponível no seu plano ou permissões",
        module: moduleName,
        currentPlan: req.user.effectivePlan || req.user.plan,
        requiredPlans: mod.plans,
      });
    }

    next();
  };
}

/**
 * Checks if user can add more links based on plan limits.
 * Use as middleware before link creation routes.
 */
export async function checkLinkLimit(req, res, next) {
  try {
    const effectivePlan = req.user.effectivePlan || req.user.plan || "free";
    const planConfig = PLANS[effectivePlan];
    if (!planConfig) return res.status(400).json({ error: "Plano inválido" });

    const ownerId = String(req.user.role === "owner" ? req.user.id : req.user.ownerId);
    const currentCount = await Link.countDocuments({ ownerId });

    if (currentCount >= planConfig.maxLinks) {
      return res.status(403).json({
        error: "Limite de links atingido",
        current: currentCount,
        max: planConfig.maxLinks,
        plan: effectivePlan,
      });
    }

    req.linkLimit = { current: currentCount, max: planConfig.maxLinks };
    next();
  } catch (err) {
    return res.status(500).json({ error: "Erro ao verificar limite" });
  }
}

/**
 * Checks if user can add more seller monitors based on plan limits.
 * Use as middleware before seller monitor creation route.
 */
export async function checkSellerMonitorLimit(req, res, next) {
  try {
    const effectivePlan = req.user.effectivePlan || req.user.plan || "free";
    const planConfig = PLANS[effectivePlan];
    if (!planConfig) return res.status(400).json({ error: "Plano inválido" });

    const ownerId = String(req.user.role === "owner" ? req.user.id : req.user.ownerId);
    const currentCount = await SellerPage.countDocuments({ ownerId });
    const maxSellerMonitors = planConfig.maxSellerMonitors ?? 0;

    if (currentCount >= maxSellerMonitors) {
      return res.status(403).json({
        error: "Limite de sellers monitorados atingido",
        current: currentCount,
        max: maxSellerMonitors,
        plan: effectivePlan,
      });
    }

    req.sellerMonitorLimit = { current: currentCount, max: maxSellerMonitors };
    next();
  } catch (err) {
    return res.status(500).json({ error: "Erro ao verificar limite" });
  }
}

/**
 * Garante que apenas o role "owner" pode acessar a rota.
 */
export function requireOwner(req, res, next) {
  if (req.user.role !== "owner") {
    return res.status(403).json({ error: "Apenas o proprietário da conta pode realizar esta ação" });
  }
  next();
}

/**
 * Verifica se o owner pode criar mais sub-usuários (admin/member) conforme o plano.
 */
export async function checkTeamUserLimit(req, res, next) {
  try {
    const effectivePlan = req.user.effectivePlan || req.user.plan || "free";
    const planConfig = PLANS[effectivePlan];
    if (!planConfig) return res.status(400).json({ error: "Plano inválido" });

    const ownerId = String(req.user.id);
    const currentCount = await User.countDocuments({
      ownerId,
      role: { $in: ["admin", "member"] },
    });
    const maxTeamUsers = planConfig.maxTeamUsers ?? 0;

    if (currentCount >= maxTeamUsers) {
      return res.status(403).json({
        error: "Limite de usuários do time atingido",
        current: currentCount,
        max: maxTeamUsers,
        plan: effectivePlan,
      });
    }

    req.teamUserLimit = { current: currentCount, max: maxTeamUsers };
    next();
  } catch (err) {
    return res.status(500).json({ error: "Erro ao verificar limite de usuários" });
  }
}

/**
 * Verifica se o owner pode criar mais times conforme o plano.
 */
export async function checkTeamLimit(req, res, next) {
  try {
    const effectivePlan = req.user.effectivePlan || req.user.plan || "free";
    const planConfig = PLANS[effectivePlan];
    if (!planConfig) return res.status(400).json({ error: "Plano inválido" });

    const ownerId = String(req.user.id);
    const currentCount = await Team.countDocuments({ ownerId });
    const maxTeams = planConfig.maxTeams ?? 0;

    if (currentCount >= maxTeams) {
      return res.status(403).json({
        error: "Limite de times atingido",
        current: currentCount,
        max: maxTeams,
        plan: effectivePlan,
      });
    }

    req.teamLimit = { current: currentCount, max: maxTeams };
    next();
  } catch (err) {
    return res.status(500).json({ error: "Erro ao verificar limite de times" });
  }
}
