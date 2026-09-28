import { format } from "date-fns";

import SellerPage from "../models/SellerPage.js";
import SellerProduct from "../models/SellerProduct.js";
import SellerAlert from "../models/SellerAlert.js";
import {
  getOwnerMeliToken,
  parseListingUrl,
  searchMeliItems,
  itemPermalink,
} from "../utils/meliProductApi.js";

const MIN_PRICE_CHANGE_ALERT_RATIO = 0.01;

function isSignificantPriceChangeForAlert(oldPrice, newPrice) {
  if (oldPrice === newPrice) return false;
  if (!Number.isFinite(oldPrice) || !Number.isFinite(newPrice)) return oldPrice !== newPrice;
  if (oldPrice <= 0) return newPrice !== oldPrice;
  return Math.abs(newPrice - oldPrice) / oldPrice > MIN_PRICE_CHANGE_ALERT_RATIO;
}

/**
 * Lista os anúncios do vendedor via /sites/MLB/search (API oficial).
 * O scraping da página de listagem foi abandonado em set/2026 (captcha / bot challenge).
 */
async function fetchSellerProducts(sellerUrl, ownerId) {
  const params = parseListingUrl(sellerUrl);
  if (!params) {
    throw Object.assign(new Error("URL do vendedor sem _CustId_, perfil ou termo de busca"), { code: "UNSUPPORTED_URL" });
  }
  const token = await getOwnerMeliToken(ownerId);
  if (!token) throw Object.assign(new Error("Nenhuma conta ML conectada"), { code: "NO_ACCOUNT" });

  const results = await searchMeliItems(params, token);
  const seen = new Set();
  const products = [];
  for (const r of results) {
    if (!r.id || seen.has(r.id)) continue;
    seen.add(r.id);
    products.push({
      url: (r.permalink || itemPermalink(r.id)).split("?")[0].split("#")[0],
      name: r.title || "",
      image: (r.thumbnail || "").replace(/^http:/, "https:"),
      price: Number(r.price) || 0,
      sku: r.id,
    });
  }
  return products;
}

export async function runScraperForSeller(seller) {
  const today = format(new Date(), "yyyy-MM-dd");
  const alertsToCreate = [];
  const ownerId = seller.ownerId;

  await SellerPage.findByIdAndUpdate(seller._id, {
    $set: { scraping: true, scrapingStartedAt: new Date() },
  });

  try {
    let scrapedProducts;
    try {
      scrapedProducts = await fetchSellerProducts(seller.url, ownerId);
    } catch (err) {
      const detail = err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : err.message;
      console.error(`[SellerScraper] Erro ao buscar seller ${seller._id}: ${detail}`);
      return;
    }

    if (!scrapedProducts.length) {
      console.warn(`[SellerScraper] Nenhum produto para seller ${seller._id}`);
      return;
    }

    await SellerProduct.updateMany({ sellerId: seller._id }, { $set: { isNew: false, priceChanged: false } });

    for (const scraped of scrapedProducts) {
      // Casa também por SKU: URLs antigas (scraping) podem diferir do permalink da API
      const existing = await SellerProduct.findOne({
        sellerId: seller._id,
        $or: [{ url: scraped.url }, { sku: scraped.sku }],
      });

      if (!existing) {
        let newProduct;
        try {
          newProduct = await SellerProduct.create({
            sellerId: seller._id,
            url: scraped.url,
            name: scraped.name,
            image: scraped.image,
            sku: scraped.sku,
            currentPrice: scraped.price,
            priceHistory: [{ price: scraped.price, date: today }],
            isNew: true,
            priceChanged: false,
          });
        } catch (err) {
          if (err.code === 11000) continue;
          throw err;
        }
        alertsToCreate.push({
          sellerId: seller._id,
          productId: newProduct._id,
          productName: scraped.name,
          productUrl: scraped.url,
          type: "new_product",
          oldPrice: 0,
          newPrice: scraped.price,
        });
      } else {
        let priceHistory = existing.priceHistory.map((h) => ({ ...h }));
        let priceChanged = false;
        const todayEntryIdx = priceHistory.findIndex((h) => h.date === today);
        if (todayEntryIdx !== -1) {
          priceHistory[todayEntryIdx] = { price: scraped.price, date: today };
        } else {
          priceHistory.push({ price: scraped.price, date: today });
          if (priceHistory.length > 4) priceHistory = priceHistory.slice(priceHistory.length - 4);
        }
        if (isSignificantPriceChangeForAlert(existing.currentPrice, scraped.price)) priceChanged = true;

        await SellerProduct.findByIdAndUpdate(existing._id, {
          $set: {
            url: scraped.url,
            sku: scraped.sku,
            name: scraped.name,
            image: scraped.image || existing.image,
            currentPrice: scraped.price,
            priceHistory,
            priceChanged,
            isNew: false,
          },
        });

        if (priceChanged) {
          alertsToCreate.push({
            sellerId: seller._id,
            productId: existing._id,
            productName: scraped.name,
            productUrl: scraped.url,
            type: "price_change",
            oldPrice: existing.currentPrice,
            newPrice: scraped.price,
          });
        }
      }
    }

    if (alertsToCreate.length) await SellerAlert.insertMany(alertsToCreate);
    await SellerPage.findByIdAndUpdate(seller._id, { $set: { lastRunAt: new Date() } });
  } finally {
    await SellerPage.findByIdAndUpdate(seller._id, {
      $set: { scraping: false, scrapingStartedAt: null },
    });
  }
}

export async function runAllActiveSellers() {
  const { enqueueSellerScrape } = await import("./scraperQueue.js");
  const sellers = await SellerPage.find({ active: true, scraping: false });
  for (const seller of sellers) {
    enqueueSellerScrape(seller, runScraperForSeller);
  }
}
