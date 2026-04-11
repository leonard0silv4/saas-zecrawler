import { MODULES, PLANS } from "../../config/plans.js";

/**
 * @param {object} userLean - usuário logado (lean/plain)
 * @param {object} ownerLean - documento do owner da conta (mesmo que user se role owner)
 */
export function computeAccess(userLean, ownerLean) {
  const owner = userLean.role === "owner" ? userLean : ownerLean;
  const effectivePlan = (owner && owner.plan) || "free";
  const planModules = Object.keys(MODULES).filter((k) => MODULES[k].plans.includes(effectivePlan));

  let allowedModules;
  if (userLean.role === "owner" || userLean.role === "admin") {
    allowedModules = planModules;
  } else {
    const perms = Array.isArray(userLean.permissions) ? [...userLean.permissions] : [];
    if (perms.includes("links") && !perms.includes("priceAnalyze")) {
      perms.push("priceAnalyze");
    }
    allowedModules = planModules.filter((m) => perms.includes(m));
  }

  return { effectivePlan, allowedModules, planModules };
}

export function planConfigFor(effectivePlan) {
  return PLANS[effectivePlan] || PLANS.free;
}
