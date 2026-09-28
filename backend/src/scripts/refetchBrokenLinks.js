import dotenv from "dotenv";
import mongoose from "mongoose";
import Link from "../models/Link.js";
import { scrapeProductData, getOwnerMeliToken } from "../utils/scraper.js";

dotenv.config();

/**
 * Refaz a busca dos links cadastrados com dados incompletos (sem nome, imagem, preço, SKU
 * ou vendedor), gerados enquanto o ML bloqueava o scraping (set/2026) — o refresh antigo
 * gravava vendedor vazio e status OutOfStock a partir da página de bloqueio. Usa a API oficial com o token
 * da conta ML conectada de cada owner.
 *
 * Uso: node src/scripts/refetchBrokenLinks.js [--dry-run]
 */
const DRY_RUN = process.argv.includes("--dry-run");

const BROKEN_FILTER = {
  $or: [
    { name: { $in: [null, ""] } },
    { image: { $in: [null, ""] } },
    { nowPrice: { $in: [null, 0] } },
    { sku: { $in: [null, ""] } },
    { seller: { $in: [null, ""] } },
  ],
};

async function main() {
  await mongoose.connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`
  );

  const broken = await Link.find(BROKEN_FILTER).lean();
  const byOwner = new Map();
  for (const link of broken) {
    const key = String(link.ownerId);
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key).push(link);
  }
  console.log(`Links incompletos: ${broken.length} (owners: ${byOwner.size})${DRY_RUN ? " [dry-run]" : ""}`);

  const stats = { fixed: 0, failed: 0, noAccount: 0, sellerRestored: 0, blocked: 0 };

  for (const [ownerId, links] of byOwner) {
    const token = await getOwnerMeliToken(ownerId);
    if (!token) {
      stats.noAccount += links.length;
      console.log(`owner ${ownerId}: sem conta ML conectada — ${links.length} link(s) ignorado(s)`);
      continue;
    }

    for (const link of links) {
      const scraped = await scrapeProductData(link.link, ownerId, 3, token);
      if (!scraped?.name) {
        stats.failed++;
        // API não libera este anúncio: ao menos restaura o vendedor apagado pelo refresh antigo
        const lastSeller = !link.seller && [...(link.history || [])].reverse().find((h) => h.seller)?.seller;
        const blocked = ["FORBIDDEN", "UNSUPPORTED_URL"].includes(scraped?.error);
        if (lastSeller) stats.sellerRestored++;
        if (blocked) stats.blocked++;
        if (!DRY_RUN && (lastSeller || blocked)) {
          await Link.updateOne(
            { _id: link._id },
            { $set: { ...(lastSeller ? { seller: lastSeller } : {}), ...(blocked ? { apiBlocked: true } : {}) } }
          );
        }
        console.log(`  falhou ${link._id} ${scraped?.error || ""}${lastSeller ? ` (vendedor restaurado: ${lastSeller})` : ""} ${link.link.slice(0, 80)}`);
        continue;
      }

      const price = Number(scraped.offers?.price || 0);
      const updates = {
        name: scraped.name,
        image: scraped.image || link.image,
        sku: scraped.sku || link.sku,
        status: scraped.offers?.availability || link.status,
        seller: scraped.seller || link.seller,
        ratingSeller: scraped.ratingSeller ?? link.ratingSeller,
        full: scraped.full,
        catalog: scraped.catalog,
        apiBlocked: false,
      };
      if (scraped.dateMl && !link.dateMl) updates.dateMl = scraped.dateMl;
      if (price > 0 && !link.nowPrice) {
        updates.nowPrice = price;
        updates.lastPrice = price;
      } else if (price > 0 && link.nowPrice !== price) {
        updates.lastPrice = link.nowPrice;
        updates.nowPrice = price;
      }

      if (!DRY_RUN) await Link.updateOne({ _id: link._id }, { $set: updates });
      stats.fixed++;
      console.log(`  ok ${link._id} ${scraped.sku} R$ ${price} ${scraped.name.slice(0, 50)}`);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  console.log(`Resultado: corrigidos=${stats.fixed} falhas=${stats.failed} (vendedor restaurado em ${stats.sellerRestored}, marcados fora de catálogo ${stats.blocked}) sem-conta=${stats.noAccount}${DRY_RUN ? " [dry-run, nada gravado]" : ""}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
