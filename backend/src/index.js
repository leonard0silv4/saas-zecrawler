import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

import { connectDB } from "../config/database.js";
import routes from "./routes/index.js";
import adminRoutes from "./routes/admin.js";
import { stripeWebhookRoute } from "./controllers/StripeController.js";
import { startCronJobs } from "./services/cron.js";
import { resetStaleScrapingFlags } from "./services/scraperQueue.js";

// Carrega .env usando caminho absoluto relativo a este arquivo,
// independente de onde o processo for iniciado.
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../.env") });

const app = express();

// Middlewares
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));

// Stripe webhook MUST come before express.json() — needs raw body
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookRoute);

// JSON parser for everything else
app.use(express.json({ limit: "10mb" }));

// Admin panel — mounted on /panel (completely separate from /api, zero conflict)
app.use("/panel", adminRoutes);

// Main app routes
app.use("/api", routes);

// Start
const PORT = process.env.PORT || 3333;

connectDB().then(async () => {
  await resetStaleScrapingFlags();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startCronJobs();
  });
});
