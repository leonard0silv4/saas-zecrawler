import { MODULES, PLANS } from "../../config/plans.js";
import Team from "../models/Team.js";

/**
 * @param {object} userLean - usuário logado (lean/plain)
 * @param {object} ownerLean - documento do owner da conta (mesmo que user se role owner)
 * @param {string[]} extraPermissions - permissões adicionais (ex: herdadas de times)
 */
export function computeAccess(userLean, ownerLean, extraPermissions = []) {
  const owner = userLean.role === "owner" ? userLean : ownerLean;
  const effectivePlan = (owner && owner.plan) || "free";
  const planModules = Object.keys(MODULES).filter((k) => MODULES[k].plans.includes(effectivePlan));

  let allowedModules;
  if (userLean.role === "owner" || userLean.role === "admin") {
    allowedModules = planModules;
  } else {
    const perms = new Set([
      ...(Array.isArray(userLean.permissions) ? userLean.permissions : []),
      ...(Array.isArray(extraPermissions) ? extraPermissions : []),
    ]);
    if (perms.has("links") && !perms.has("priceAnalyze")) {
      perms.add("priceAnalyze");
    }
    if (perms.has("meliCatalog") && !perms.has("meliAnalytics")) {
      perms.add("meliAnalytics");
    }
    allowedModules = planModules.filter((m) => perms.has(m));
  }

  return { effectivePlan, allowedModules, planModules };
}

/**
 * Carrega as permissões de todos os times de um usuário member.
 * Retorna array flat com a união de todas as permissões dos times.
 */
export async function loadTeamPermissions(user) {
  if (user.role !== "member") return [];
  const ids = Array.isArray(user.teamIds) ? user.teamIds : [];
  if (!ids.length) return [];
  const teams = await Team.find({ _id: { $in: ids } }).lean();
  return [...new Set(teams.flatMap((t) => (Array.isArray(t.permissions) ? t.permissions : [])))];
}

export function planConfigFor(effectivePlan) {
  return PLANS[effectivePlan] || PLANS.free;
}
