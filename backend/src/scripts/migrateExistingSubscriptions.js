/**
 * Migrates existing active Stripe subscriptions to the new price IDs.
 *
 * - Uses proration_behavior: 'create_prorations' so each customer sees a
 *   proportional credit/debit on their next invoice — no immediate charge.
 * - Run with DRY_RUN=true first to validate before applying.
 *
 * Usage:
 *   DRY_RUN=true node src/scripts/migrateExistingSubscriptions.js
 *   node src/scripts/migrateExistingSubscriptions.js
 */
import Stripe from "stripe";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DRY_RUN = process.env.DRY_RUN === "true";

const NEW_PRICE_IDS = {
  starter:  process.env.STRIPE_PRICE_STARTER,
  pro:      process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

// Reverse map: old price ID → plan slug (populated from env at startup)
// Old price IDs should be set here or loaded from a separate env var if needed.
// If the old prices are still in STRIPE_PRICE_*, they will be the same as new ones
// after you update .env — so set OLD_STRIPE_PRICE_* in .env before running.
const OLD_PRICE_IDS = {
  [process.env.OLD_STRIPE_PRICE_STARTER]:  "starter",
  [process.env.OLD_STRIPE_PRICE_PRO]:       "pro",
  [process.env.OLD_STRIPE_PRICE_BUSINESS]:  "business",
};

async function run() {
  console.log(`\n═══ Subscription Migration ${DRY_RUN ? "[DRY RUN]" : "[LIVE]"} ═══\n`);

  if (!NEW_PRICE_IDS.starter || !NEW_PRICE_IDS.pro || !NEW_PRICE_IDS.business) {
    console.error("ERROR: Missing STRIPE_PRICE_* env vars. Set new price IDs first.");
    process.exit(1);
  }

  let processed = 0, skipped = 0, failed = 0;
  let hasMore = true;
  let startingAfter;

  while (hasMore) {
    const params = { limit: 100, status: "active", expand: ["data.items"] };
    if (startingAfter) params.starting_after = startingAfter;

    const page = await stripe.subscriptions.list(params);

    for (const sub of page.data) {
      const item = sub.items.data[0];
      if (!item) { skipped++; continue; }

      const currentPriceId = item.price.id;
      const planSlug = OLD_PRICE_IDS[currentPriceId];

      if (!planSlug) {
        console.log(`  SKIP sub=${sub.id} price=${currentPriceId} (not a known old price)`);
        skipped++;
        continue;
      }

      const newPriceId = NEW_PRICE_IDS[planSlug];
      if (currentPriceId === newPriceId) {
        console.log(`  SKIP sub=${sub.id} plan=${planSlug} (already on new price)`);
        skipped++;
        continue;
      }

      console.log(`  ${DRY_RUN ? "DRY" : "UPD"} sub=${sub.id} customer=${sub.customer} plan=${planSlug} ${currentPriceId} → ${newPriceId}`);

      if (!DRY_RUN) {
        try {
          await stripe.subscriptions.update(sub.id, {
            items: [{ id: item.id, price: newPriceId }],
            proration_behavior: "create_prorations",
          });
          processed++;
        } catch (err) {
          console.error(`  ERROR sub=${sub.id}: ${err.message}`);
          failed++;
        }
      } else {
        processed++;
      }
    }

    hasMore = page.has_more;
    if (hasMore) startingAfter = page.data[page.data.length - 1].id;
  }

  console.log(`\n─── Result ───`);
  console.log(`  Updated : ${processed}`);
  console.log(`  Skipped : ${skipped}`);
  console.log(`  Failed  : ${failed}`);
  if (DRY_RUN) console.log("\n  Re-run without DRY_RUN=true to apply changes.");
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
