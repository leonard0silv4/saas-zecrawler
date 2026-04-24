import test from "node:test";
import assert from "node:assert/strict";
import { computeAccess } from "../utils/access.js";

test("módulo meliMessages disponível apenas para plano business", () => {
  const ownerPro = { role: "owner", plan: "pro" };
  const ownerBusiness = { role: "owner", plan: "business" };

  const proAccess = computeAccess(ownerPro, ownerPro);
  const businessAccess = computeAccess(ownerBusiness, ownerBusiness);

  assert.equal(proAccess.allowedModules.includes("meliMessages"), false);
  assert.equal(businessAccess.allowedModules.includes("meliMessages"), true);
});
