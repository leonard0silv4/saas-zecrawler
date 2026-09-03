/**
 * Creates Stripe Products + Prices for each paid plan.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node src/scripts/seedStripeProducts.js
 *
 * Output: the STRIPE_PRICE_* values to paste into .env
 */
import Stripe from "stripe";
import dotenv from "dotenv";
import { fileURLToPath } from "url";                                                                                                                                                                             
import { dirname, resolve } from "path";
                                                                                                                                                                                                                 
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PAID_PLANS = [
  { slug: "starter", name: "ML SmartHub Starter", price: 1990, description: "30 links, 5 sellers, 1 conta ML, analytics, catálogo ML, mensagens ML (100/mês)" },
  { slug: "pro", name: "ML SmartHub Pro", price: 2990, description: "50 links, 10 sellers, 3 contas ML, mensagens ML (200/mês)" },
  { slug: "business", name: "ML SmartHub Business", price: 4990, description: "200 links, 20 sellers, 10 contas ML, mensagens ML ilimitadas" },
];

async function run() {
  console.log("Creating Stripe products and prices...\n");
  const envLines = [];

  for (const plan of PAID_PLANS) {
    // Check if product already exists by metadata
    const existing = await stripe.products.search({
      query: `metadata["slug"]:"${plan.slug}"`,
    });

    let product;
    if (existing.data.length > 0) {
      product = existing.data[0];
      console.log(`Product "${plan.name}" already exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { slug: plan.slug },
      });
      console.log(`Created product "${plan.name}": ${product.id}`);
    }

    // Check for existing price
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    const existingPrice = prices.data.find(
      (p) => p.unit_amount === plan.price && p.currency === "brl" && p.recurring?.interval === "month"
    );

    let price;
    if (existingPrice) {
      price = existingPrice;
      console.log(`  Price already exists: ${price.id} (R$ ${(price.unit_amount / 100).toFixed(2)})`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price, // in centavos
        currency: "brl",
        recurring: { interval: "month" },
        metadata: { slug: plan.slug },
      });
      console.log(`  Created price: ${price.id} (R$ ${(price.unit_amount / 100).toFixed(2)}/mês)`);
    }

    const envKey = `STRIPE_PRICE_${plan.slug.toUpperCase()}`;
    envLines.push(`${envKey}=${price.id}`);
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("Add these to your .env file:\n");
  envLines.forEach((line) => console.log(line));
  console.log("\n═══════════════════════════════════════════");
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
