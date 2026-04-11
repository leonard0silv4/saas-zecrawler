import Bottleneck from "bottleneck";
import SellerPage from "../models/SellerPage.js";

const limiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 1000,
});

const pendingIds = new Set();

export function isSellerPending(sellerId) {
  return pendingIds.has(String(sellerId));
}

export function enqueueSellerScrape(seller, scraperFn) {
  const id = String(seller._id);

  if (pendingIds.has(id)) {
    console.log(`[ScraperQueue] Seller ${id} já está na fila.`);
    return false;
  }

  pendingIds.add(id);

  limiter
    .schedule(() => scraperFn(seller))
    .catch((err) => console.error(`[ScraperQueue] Erro no seller ${id}:`, err.message))
    .finally(() => {
      pendingIds.delete(id);
    });

  return true;
}

export async function resetStaleScrapingFlags() {
  const result = await SellerPage.updateMany(
    { scraping: true },
    { $set: { scraping: false, scrapingStartedAt: null } }
  );
  if (result.modifiedCount > 0) {
    console.log(`[ScraperQueue] ${result.modifiedCount} seller(s) com scraping resetado no boot.`);
  }
}

export async function resetStaleByTimeout(timeoutMinutes = 30) {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
  const result = await SellerPage.updateMany(
    { scraping: true, scrapingStartedAt: { $lt: cutoff } },
    { $set: { scraping: false, scrapingStartedAt: null } }
  );
  return result.modifiedCount;
}
