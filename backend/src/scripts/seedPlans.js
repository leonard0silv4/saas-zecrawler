import mongoose from "mongoose";
import { PLANS } from "../../config/plans.js";

import dotenv from "dotenv";
import { fileURLToPath } from "url";                                                                                                                                                                             
import { dirname, resolve } from "path";
                                                                                                                                                                                                                 
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

async function run() {
  await mongoose.connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`
  );

  console.log("Plans configured:");
  for (const [key, plan] of Object.entries(PLANS)) {
    console.log(`  ${key}: R$${plan.price}/mês - ${plan.maxLinks} links`);
  }

  console.log("\nPlans are defined in config/plans.js — no DB collection needed.");
  await mongoose.disconnect();
}

run().catch(console.error);
