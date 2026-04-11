import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB } from "../config/database.js";
import routes from "./routes/index.js";
import { stripeWebhookRoute } from "./controllers/StripeController.js";
import { startCronJobs } from "./services/cron.js";
import { resetStaleScrapingFlags } from "./services/scraperQueue.js";

dotenv.config();

const app = express();

// Middlewares
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));

// Stripe webhook MUST come before express.json() — needs raw body
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookRoute);

// JSON parser for everything else
app.use(express.json({ limit: "10mb" }));

// Routes
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
