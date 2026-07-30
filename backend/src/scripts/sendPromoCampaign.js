import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

import User from "../models/User.js";
import { sendPromoEmail } from "../services/emailService.js";

const DELAY_MS = 600;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const testArg = process.argv.find((arg) => arg.startsWith("--test="));
  const testEmail = testArg ? testArg.split("=")[1] : null;

  await mongoose.connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`
  );

  let recipients;
  if (testEmail) {
    recipients = [{ email: testEmail, name: "" }];
    console.log(`[MODO TESTE] Enviando apenas para: ${testEmail}`);
  } else {
    recipients = await User.find({ role: "owner", plan: "free" }, "email name").lean();
    console.log(`Encontrados ${recipients.length} usuários no plano gratuito.`);
  }

  let sent = 0;
  let failed = 0;

  for (const user of recipients) {
    try {
      await sendPromoEmail(user.email, user.name);
      sent++;
      console.log(`  ✓ enviado: ${user.email}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ falhou: ${user.email} — ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nResumo: ${sent} enviados, ${failed} falharam.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
