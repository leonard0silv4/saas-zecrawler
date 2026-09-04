import test from "node:test";
import assert from "node:assert/strict";
import { requireModule, getMeliMessageUsage } from "../middleware/plan.js";

function createRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
}

test("requireModule bloqueia meliMessages fora do business", () => {
  const middleware = requireModule("meliMessages");
  const req = {
    user: {
      plan: "pro",
      effectivePlan: "pro",
      allowedModules: ["links", "meli"],
    },
  };
  const res = createRes();
  let calledNext = false;

  middleware(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.module, "meliMessages");
});

test("requireModule permite meliMessages no business", () => {
  const middleware = requireModule("meliMessages");
  const req = {
    user: {
      plan: "business",
      effectivePlan: "business",
      allowedModules: ["links", "meli", "meliMessages"],
    },
  };
  const res = createRes();
  let calledNext = false;

  middleware(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
  assert.equal(res.statusCode, 200);
});

test("getMeliMessageUsage retorna max: null (ilimitado) no plano business, sem contar documentos", async () => {
  const usage = await getMeliMessageUsage("owner-id", "business");
  assert.deepEqual(usage, { current: null, max: null, plan: "business" });
});
