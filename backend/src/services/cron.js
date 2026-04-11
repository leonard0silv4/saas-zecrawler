import cron from "node-cron";
import User from "../models/User.js";
import Link from "../models/Link.js";
import { scrapeProductData } from "../utils/scraper.js";
import { resetStaleByTimeout } from "./scraperQueue.js";
import { runAllActiveSellers } from "./sellerScraper.js";

/**
 * Cron: atualiza links de todos os usuários com sendEmail habilitado.
 * Roda a cada 30 min por padrão. Cada user pode ter seu cronInterval.
 */
const activeCrons = new Map();

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
