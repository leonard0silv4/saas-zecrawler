import cron from "node-cron";
import User from "../models/User.js";
import Link from "../models/Link.js";
import Conta from "../models/Conta.js";
import { scrapeProductData } from "../utils/scraper.js";
import { resetStaleByTimeout } from "./scraperQueue.js";
import { runAllActiveSellers } from "./sellerScraper.js";
import { syncQuestionsForOwner } from "./meliMessagesService.js";
import { syncOrdersForConta } from "../controllers/MeliAnalyticsController.js";
import { syncProductsForConta } from "../controllers/MeliController.js";
import { runDataCleanup } from "./dataCleanupService.js";

/**
 * Cron: atualiza links de todos os usuários com sendEmail habilitado.
 * Roda a cada 30 min por padrão. Cada user pode ter seu cronInterval.
 */
const activeCrons = new Map();
const activeMeliSyncLocks = new Set();

export function startCronJobs() {
  // Master cron: checks users every 30 min and schedules individual crons
  cron.schedule("*/30 * * * *", async () => {
    try {
      const users = await User.find({ sendEmail: true });

      for (const user of users) {
        const interval = user.cronInterval || "0 * * * *";
        const key = String(user._id);

        if (activeCrons.has(key) && activeCrons.get(key).interval === interval) continue;

        // Stop existing cron if interval changed
        if (activeCrons.has(key)) activeCrons.get(key).task.stop();

        const task = cron.schedule(interval, () => refreshUserLinks(key));
        activeCrons.set(key, { task, interval });
        console.log(`[Cron] Scheduled for user ${key} (${interval})`);
      }
    } catch (err) {
      console.error("[Cron] Error:", err);
    }
  });

  // Libera scrapings de seller travados
  cron.schedule("*/15 * * * *", async () => {
    try {
      await resetStaleByTimeout(45);
    } catch (e) {
      console.error("[Cron] resetStaleByTimeout:", e);
    }
  });

  // Monitor de sellers: uma vez por dia às 4h
  cron.schedule("0 4 * * *", async () => {
    try {
      await runAllActiveSellers();
      console.log("[Cron] Seller monitor diário enfileirado");
    } catch (e) {
      console.error("[Cron] runAllActiveSellers:", e);
    }
  });

  // Mensagens ML: sincroniza perguntas não respondidas periodicamente
  cron.schedule("*/5 * * * *", async () => {
    try {
      const ownerIds = await Conta.distinct("ownerId", {
        access_token: { $exists: true },
        disabled: { $ne: true },
      });

      for (const ownerId of ownerIds) {
        const ownerKey = String(ownerId);
        if (activeMeliSyncLocks.has(ownerKey)) continue;
        activeMeliSyncLocks.add(ownerKey);
        try {
          const result = await syncQuestionsForOwner(ownerKey);
          if (result.syncedCount > 0) {
            console.log(`[Cron] MeliMessages owner=${ownerKey} synced=${result.syncedCount}`);
          }
        } catch (error) {
          console.error(`[Cron] MeliMessages owner=${ownerKey}:`, error.message);
        } finally {
          activeMeliSyncLocks.delete(ownerKey);
        }
      }
    } catch (error) {
      console.error("[Cron] MeliMessages schedule:", error.message);
    }
  });

  // Analytics ML: sincroniza pedidos a cada 15 min para owners Business
  cron.schedule("*/15 * * * *", async () => {
    try {
      const businessOwners = await User.find({
        role: "owner",
        plan: "business",
        stripeSubscriptionStatus: { $in: ["active", "trialing"] },
      }).select("_id");

      const ownerIds = businessOwners.map((u) => u._id);
      if (!ownerIds.length) return;

      const contas = await Conta.find({
        ownerId: { $in: ownerIds },
        access_token: { $exists: true },
        disabled: { $ne: true },
        $or: [{ authError: { $exists: false } }, { authError: null }],
      });

      for (const conta of contas) {
        try {
          await syncOrdersForConta(conta, conta.ownerId);
        } catch (err) {
          const status = err.response?.status;
          const detail = status ? `HTTP ${status}` : err.message;
          console.error(`[Cron] Analytics orders conta=${conta.user_id}: ${detail}`);
        }
      }
    } catch (err) {
      console.error("[Cron] Analytics orders sync:", err.message);
    }
  });

  // Sync completo de produtos ML: a cada 6h para usuários Business
  // Intervalo de 6h equilibra atualização de estoque vs. tráfego na API do ML
  cron.schedule("0 */6 * * *", async () => {
    try {
      const businessOwners = await User.find({
        role: "owner",
        plan: "business",
        stripeSubscriptionStatus: { $in: ["active", "trialing"] },
      }).select("_id");

      if (!businessOwners.length) return;

      const contas = await Conta.find({
        ownerId: { $in: businessOwners.map((u) => u._id) },
        access_token: { $exists: true },
        disabled: { $ne: true },
        $or: [{ authError: { $exists: false } }, { authError: null }],
      });

      for (const conta of contas) {
        try {
          await syncProductsForConta(conta, conta.ownerId);
        } catch (err) {
          console.error(`[Cron] Products sync conta=${conta.user_id}:`, err.message);
        }
      }
    } catch (err) {
      console.error("[Cron] Products sync schedule:", err.message);
    }
  });

  // Limpeza de dados antigos: todo dia às 3h (retenção de 90 dias)
  cron.schedule("0 3 * * *", async () => {
    try {
      await runDataCleanup();
    } catch (e) {
      console.error("[Cron] Data cleanup:", e);
    }
  });

  console.log("[Cron] Master cron started");
}

async function refreshUserLinks(ownerId) {
  try {
    const links = await Link.find({ ownerId }).sort({ createdAt: -1 });

    for (const link of links) {
      try {
        const scraped = await scrapeProductData(link.link, ownerId);
        if (!scraped) continue;

        const newPrice = Number(scraped.offers?.price || 0);
        if (newPrice > 0 && link.nowPrice !== newPrice) {
          await Link.findByIdAndUpdate(link._id, {
            $set: { nowPrice: newPrice, lastPrice: link.nowPrice, seller: scraped.seller },
            $push: {
              history: {
                $each: [{ price: newPrice, seller: scraped.seller }],
                $slice: -20,
              },
            },
          });
        }
      } catch (e) {
        console.error(`[Cron] Error refreshing ${link.link}:`, e.message);
      }
    }
  } catch (err) {
    console.error(`[Cron] refreshUserLinks error:`, err);
  }
}
