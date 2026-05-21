import test from "node:test";
import assert from "node:assert/strict";
import { computeAccess } from "../utils/access.js";

// ─── computeAccess com extraPermissions ───────────────────────────────────────

test("member sem permissões próprias mas com extraPermissions herda do time", () => {
  const owner = { role: "owner", plan: "pro" };
  const member = { role: "member", permissions: [] };
  const teamPerms = ["links", "catalog"];
  const { allowedModules } = computeAccess(member, owner, teamPerms);
  assert.ok(allowedModules.includes("links"), "deve ter links");
  assert.ok(allowedModules.includes("catalog"), "deve ter catalog");
  assert.ok(allowedModules.includes("priceAnalyze"), "deve ter priceAnalyze (auto-add com links)");
  assert.ok(!allowedModules.includes("meliMessages"), "não deve ter meliMessages");
});

test("member com permissões próprias e de time recebe UNIÃO das duas", () => {
  const owner = { role: "owner", plan: "business" };
  const member = { role: "member", permissions: ["meli"] };
  const teamPerms = ["links", "sellerMonitor"];
  const { allowedModules } = computeAccess(member, owner, teamPerms);
  assert.ok(allowedModules.includes("meli"), "deve ter meli (próprio)");
  assert.ok(allowedModules.includes("links"), "deve ter links (do time)");
  assert.ok(allowedModules.includes("sellerMonitor"), "deve ter sellerMonitor (do time)");
});

test("member com extraPermissions limitado pelo plano do owner", () => {
  const owner = { role: "owner", plan: "starter" };
  const member = { role: "member", permissions: [] };
  // catalog só existe no pro+, não deve aparecer em starter
  const teamPerms = ["catalog", "links"];
  const { allowedModules } = computeAccess(member, owner, teamPerms);
  assert.ok(!allowedModules.includes("catalog"), "catalog não deve aparecer no plano starter");
  assert.ok(allowedModules.includes("links"), "links deve aparecer");
});

test("owner ignora extraPermissions e tem acesso total ao plano", () => {
  const owner = { role: "owner", plan: "pro" };
  const { allowedModules } = computeAccess(owner, owner, ["links"]);
  assert.ok(allowedModules.includes("catalog"), "owner pro deve ter catalog independente de extraPermissions");
});

test("member sem permissões e sem time não acessa nenhum módulo", () => {
  const owner = { role: "owner", plan: "business" };
  const member = { role: "member", permissions: [] };
  const { allowedModules } = computeAccess(member, owner, []);
  assert.equal(allowedModules.length, 0, "nenhum módulo sem permissões");
});

test("extraPermissions vazio não quebra a função", () => {
  const owner = { role: "owner", plan: "free" };
  const member = { role: "member", permissions: ["links"] };
  const { allowedModules } = computeAccess(member, owner);
  assert.ok(allowedModules.includes("links"), "deve ter links mesmo sem extraPermissions");
});
