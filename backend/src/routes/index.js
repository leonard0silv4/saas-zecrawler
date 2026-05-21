import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireModule, checkLinkLimit, checkSellerMonitorLimit, requireOwner, checkTeamUserLimit, checkTeamLimit } from "../middleware/plan.js";
import { addSSEClient, removeSSEClient } from "../utils/sse.js";
import { getOwnerId } from "../middleware/auth.js";

import AuthController from "../controllers/AuthController.js";
import StripeController from "../controllers/StripeController.js";
import LinkController from "../controllers/LinkController.js";
import MeliController from "../controllers/MeliController.js";
import MeliMessagesController from "../controllers/MeliMessagesController.js";
import CatalogProductController from "../controllers/CatalogProductController.js";
import CookieController from "../controllers/CookieController.js";
import PriceAnalyzeController from "../controllers/PriceAnalyzeController.js";
import SellerMonitorController from "../controllers/SellerMonitorController.js";
import SettingsController from "../controllers/SettingsController.js";
import TeamController from "../controllers/TeamController.js";

const r = Router();

// ─── Health ────────────────────────────────────────────────────
r.get("/", (req, res) => res.json({ status: "ok", version: "2.0.0" }));
r.get("/health", (req, res) => res.json({ status: "ok", date: new Date() }));

// ─── Auth (public) ─────────────────────────────────────────────
r.post("/auth/register", AuthController.register);
r.post("/auth/login", AuthController.login);
r.get("/auth/me", authenticate, AuthController.me);
r.put("/auth/plan", authenticate, AuthController.updatePlan);
r.get("/plans", AuthController.getPlans);

// ─── ML OAuth (public callbacks) ───────────────────────────────
r.get("/meli/auth", MeliController.authRedirect);
r.get("/meli/callback", MeliController.authCallback);

// ─── All routes below require authentication ───────────────────
r.use(authenticate);

// ─── Configurações da conta (owner) ────────────────────────────
r.get("/settings", SettingsController.show);
r.put("/settings", SettingsController.update);

// ─── Stripe Billing ────────────────────────────────────────────
r.post("/stripe/checkout", StripeController.createCheckout);
r.post("/stripe/portal", StripeController.createPortal);
r.get("/stripe/status", StripeController.status);
r.post("/stripe/downgrade", StripeController.downgrade);
// NOTE: /api/stripe/webhook is mounted in index.js (needs raw body)

// ─── Links ─────────────────────────────────────────────────────
r.get("/links", requireModule("links"), LinkController.index);
r.get("/links/tags", requireModule("links"), LinkController.getTags);
r.get("/links/refresh/:storeName", requireModule("links"), LinkController.refresh);
r.post("/links", requireModule("links"), checkLinkLimit, LinkController.store);
r.post("/links/batch", requireModule("links"), checkLinkLimit, LinkController.storeBatch);
r.put("/links/:id", requireModule("links"), LinkController.update);
r.delete("/links/:id", requireModule("links"), LinkController.destroy);
r.delete("/links/all/:storeName", requireModule("links"), LinkController.destroyAll);
r.post("/links/clear-rates/:storeName", requireModule("links"), LinkController.clearRates);

// ─── Análise de preços (XML como no script Python + visão rápida) ─
r.get("/price-analyze", requireModule("priceAnalyze"), PriceAnalyzeController.index);
r.get("/price-analyze/xml", requireModule("priceAnalyze"), PriceAnalyzeController.xml);
r.post("/price-analyze/generate", requireModule("priceAnalyze"), PriceAnalyzeController.generate);

// ─── Seller Monitor ────────────────────────────────────────────
r.get("/seller-monitor", requireModule("sellerMonitor"), SellerMonitorController.index);
r.post("/seller-monitor", requireModule("sellerMonitor"), checkSellerMonitorLimit, SellerMonitorController.store);
r.delete("/seller-monitor/:id", requireModule("sellerMonitor"), SellerMonitorController.destroy);
r.get("/seller-monitor/:id/products", requireModule("sellerMonitor"), SellerMonitorController.getProducts);
r.post("/seller-monitor/:id/run", requireModule("sellerMonitor"), SellerMonitorController.runScrape);
r.post("/seller-monitor/:id/reset-stuck", requireModule("sellerMonitor"), SellerMonitorController.resetStuck);
r.get("/seller-monitor/:id/alerts", requireModule("sellerMonitor"), SellerMonitorController.getAlerts);
r.put("/seller-monitor/:id/alerts/read-all", requireModule("sellerMonitor"), SellerMonitorController.markAllAlertsRead);
r.put("/seller-monitor/alerts/:alertId/read", requireModule("sellerMonitor"), SellerMonitorController.markAlertRead);

// ─── Mercado Livre ─────────────────────────────────────────────
r.get("/meli/accounts", requireModule("meli"), MeliController.getAccounts);
r.delete("/meli/accounts/:userId", requireModule("meli"), MeliController.disconnectAccount);
r.get("/meli/products", requireModule("meli"), MeliController.getProducts);
r.get("/meli/products/autocomplete", requireModule("meli"), MeliController.autocompleteProducts);
r.get("/meli/items/:itemId/permalink", requireModule("meli"), MeliController.getItemPermalink);
r.get("/meli/shipment/:shipmentId", requireModule("meli"), MeliController.getShipment);
r.get("/meli/messages/questions", requireModule("meliMessages"), MeliMessagesController.listQuestions);
r.post("/meli/messages/questions/:questionId/reply", requireModule("meliMessages"), MeliMessagesController.replyQuestion);
r.delete("/meli/messages/questions/:questionId", requireModule("meliMessages"), MeliMessagesController.deleteQuestion);
r.get("/meli/messages/templates", requireModule("meliMessages"), MeliMessagesController.listTemplates);
r.post("/meli/messages/templates", requireModule("meliMessages"), MeliMessagesController.createTemplate);
r.put("/meli/messages/templates/:id", requireModule("meliMessages"), MeliMessagesController.updateTemplate);
r.delete("/meli/messages/templates/:id", requireModule("meliMessages"), MeliMessagesController.deleteTemplate);
r.post("/meli/messages/sync", requireModule("meliMessages"), MeliMessagesController.sync);

// ─── Catálogo ──────────────────────────────────────────────────
r.get("/catalog", requireModule("catalog"), CatalogProductController.index);
r.post("/catalog", requireModule("catalog"), CatalogProductController.store);
r.put("/catalog/:id", requireModule("catalog"), CatalogProductController.update);
r.delete("/catalog/:id", requireModule("catalog"), CatalogProductController.destroy);
r.post("/catalog/import", requireModule("catalog"), CatalogProductController.importFromXLS);

// ─── Cookies ML ────────────────────────────────────────────────
r.get("/cookies", CookieController.index);
r.post("/cookies", CookieController.update);
r.delete("/cookies", CookieController.destroy);

// ─── Time & Usuários (owner only) ──────────────────────────────
r.get("/team/users",                        requireOwner, TeamController.listUsers);
r.post("/team/users",                       requireOwner, checkTeamUserLimit, TeamController.createUser);
r.put("/team/users/:id",                    requireOwner, TeamController.updateUser);
r.put("/team/users/:id/password",           requireOwner, TeamController.updateUserPassword);
r.delete("/team/users/:id",                 requireOwner, TeamController.deleteUser);

r.get("/team/teams",                        requireOwner, TeamController.listTeams);
r.post("/team/teams",                       requireOwner, checkTeamLimit, TeamController.createTeam);
r.put("/team/teams/:id",                    requireOwner, TeamController.updateTeam);
r.delete("/team/teams/:id",                 requireOwner, TeamController.deleteTeam);
r.post("/team/teams/:id/members",           requireOwner, TeamController.addMember);
r.delete("/team/teams/:id/members/:userId", requireOwner, TeamController.removeMember);

// ─── SSE (Server-Sent Events) ──────────────────────────────────
r.get("/events", (req, res) => {
  const ownerId = getOwnerId(req);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(`data: connected\n\n`);

  addSSEClient(ownerId, res);
  const ping = setInterval(() => res.write(`data: ping\n\n`), 30000);

  req.on("close", () => {
    clearInterval(ping);
    removeSSEClient(ownerId, res);
  });
});

export default r;
