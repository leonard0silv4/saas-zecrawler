import { format } from "date-fns";

import SellerPage from "../models/SellerPage.js";
import SellerProduct from "../models/SellerProduct.js";
import SellerAlert from "../models/SellerAlert.js";
import CatalogScan from "../models/CatalogScan.js";
import CatalogScanState from "../models/CatalogScanState.js";
import { parseListingUrl, itemPermalink } from "../utils/meliProductApi.js";
import { scanOwnerCatalogs } from "./catalogScanner.js";

const MIN_PRICE_CHANGE_ALERT_RATIO = 0.01;

function isSignificantPriceChangeForAlert(oldPrice, newPrice) {
  if (oldPrice === newPrice) return false;
  if (!Number.isFinite(oldPrice) || !Number.isFinite(newPrice)) return oldPrice !== newPrice;
  if (oldPrice <= 0) return newPrice !== oldPrice;
  return Math.abs(newPrice - oldPrice) / oldPrice > MIN_PRICE_CHANGE_ALERT_RATIO;
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Descobre o id ML do vendedor: mlSellerId salvo, _CustId_ da URL ou nickname
 * (/pagina/NICK, /perfil/NICK) encontrado nas ofertas da varredura de catálogos.
 */
async function resolveSellerId(seller) {
  if (seller.mlSellerId) return { sellerId: seller.mlSellerId, nickname: seller.nickname };

  const params = parseListingUrl(seller.url) || {};
  if (params.seller_id) return { sellerId: Number(params.seller_id), nickname: seller.nickname };

  const nickname = params.nickname || seller.nickname;
  if (!nickname) return null;

  const doc = await CatalogScan.findOne(
    { ownerId: seller.ownerId, "offers.nickname": new RegExp(`^${escapeRegex(nickname)}$`, "i") },
    { "offers.$": 1 }
  ).lean();
  const offer = doc?.offers?.[0];
  return offer ? { sellerId: offer.sellerId, nickname: offer.nickname } : null;
}

/**
 * Anúncios do vendedor nos catálogos varridos (API oficial não permite listar a loja inteira).
 */
async function fetchSellerProducts(seller, sellerId) {
  const docs = await CatalogScan.find({ ownerId: seller.ownerId, "offers.sellerId": sellerId }).lean();
  const products = [];
  const seen = new Set();
  for (const doc of docs) {
    for (const o of doc.offers) {
      if (o.sellerId !== sellerId || seen.has(o.itemId)) continue;
      seen.add(o.itemId);
      products.push({ url: itemPermalink(o.itemId), name: doc.name, image: doc.image, price: o.price, sku: o.itemId });
    }
  }
  return products;
}

const SCAN_MAX_AGE_MS = 20 * 60 * 60 * 1000;

/** Varre os catálogos do owner se a última varredura for mais velha que maxAgeMs. */
export async function ensureFreshScan(ownerId, maxAgeMs = SCAN_MAX_AGE_MS) {
  const state = await CatalogScanState.findOne({ ownerId }).lean();
  const age = state?.lastRunAt ? Date.now() - new Date(state.lastRunAt).getTime() : Infinity;
  if (age > maxAgeMs) await scanOwnerCatalogs(ownerId);
}

export async function runScraperForSeller(seller, { scanMaxAgeMs = SCAN_MAX_AGE_MS } = {}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const alertsToCreate = [];
  const ownerId = seller.ownerId;

  await SellerPage.findByIdAndUpdate(seller._id, {
    $set: { scraping: true, scrapingStartedAt: new Date() },
  });

  try {
    let scrapedProducts;
    try {
      await ensureFreshScan(ownerId, scanMaxAgeMs);
      const resolved = await resolveSellerId(seller);
      scrapedProducts = resolved ? await fetchSellerProducts(seller, resolved.sellerId) : [];
      await SellerPage.findByIdAndUpdate(seller._id, {
        $set: {
          noData: scrapedProducts.length === 0,
          ...(resolved ? { mlSellerId: resolved.sellerId, nickname: resolved.nickname || seller.nickname } : {}),
        },
      });
    } catch (err) {
      const detail = err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : err.message;
      console.error(`[SellerScraper] Erro ao buscar seller ${seller._id}: ${detail}`);
      return;
    }

    if (!scrapedProducts.length) {
      console.warn(`[SellerScraper] Seller ${seller._id} sem dados nos catálogos varridos`);
      await SellerPage.findByIdAndUpdate(seller._id, { $set: { lastRunAt: new Date() } });
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

/**
 * Cron diário: varre os catálogos de cada owner uma vez e depois atualiza todos os sellers dele.
 */
export async function runAllActiveSellers() {
  const sellers = await SellerPage.find({ active: true, scraping: false });
  const byOwner = new Map();
  for (const s of sellers) {
    const k = String(s.ownerId);
    if (!byOwner.has(k)) byOwner.set(k, []);
    byOwner.get(k).push(s);
  }

  for (const [ownerId, list] of byOwner) {
    try {
      await scanOwnerCatalogs(ownerId);
      for (const seller of list) await runScraperForSeller(seller, { scanMaxAgeMs: Infinity });
    } catch (err) {
      console.error(`[SellerScraper] owner ${ownerId}:`, err.message);
    }
  }
}
