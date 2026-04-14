import superagent from "superagent";
import * as cheerio from "cheerio";
import { format } from "date-fns";

import SellerPage from "../models/SellerPage.js";
import SellerProduct from "../models/SellerProduct.js";
import SellerAlert from "../models/SellerAlert.js";
import Cookie from "../models/Cookie.js";
import mongoose from "mongoose";

async function loadCookieString(ownerId) {
  const oid = new mongoose.Types.ObjectId(String(ownerId));
  const cookies = await Cookie.find({ ownerId: oid }).lean();
  if (!cookies.length) return "";
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

function extractSkuFromUrl(url) {
  const match = url.match(/MLB-?(\d+)/i);
  return match ? `MLB${match[1]}` : "";
}

function cleanUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split("#")[0].split("?")[0];
  }
}

const MIN_PRICE_CHANGE_ALERT_RATIO = 0.01;

function isSignificantPriceChangeForAlert(oldPrice, newPrice) {
  if (oldPrice === newPrice) return false;
  if (!Number.isFinite(oldPrice) || !Number.isFinite(newPrice)) return oldPrice !== newPrice;
  if (oldPrice <= 0) return newPrice !== oldPrice;
  return Math.abs(newPrice - oldPrice) / oldPrice > MIN_PRICE_CHANGE_ALERT_RATIO;
}

const ML_PAGE_SIZE = 48;

function buildPageUrl(baseUrl, pageNumber) {
  if (pageNumber <= 1) return baseUrl;
  const offset = 1 + (pageNumber - 1) * ML_PAGE_SIZE;
  const cleanBase = baseUrl.replace(/_Desde_\d+_/g, "_").replace(/_Desde_\d+$/g, "");
  if (cleanBase.includes("_NoIndex_True")) {
    return cleanBase.replace("_NoIndex_True", `_Desde_${offset}_NoIndex_True`);
  }
  const sep = cleanBase.endsWith("/") ? "" : "/";
  return `${cleanBase}${sep}_Desde_${offset}`;
}

function parseTotalCount($) {
  const candidates = [
    $(".ui-search-search-result__quantity-results").text(),
    $('[class*="quantity-results"]').text(),
    $('[class*="result-info"]').text(),
  ];
  for (const text of candidates) {
    const match = text.match(/([\d.,]+)\s*resultado/i);
    if (match) return parseInt(match[1].replace(/[.,]/g, ""), 10);
  }
  return null;
}

async function extractProductsFromPage(url, ownerId) {
  const cookieString = await loadCookieString(ownerId);
  const request = superagent.get(url).timeout({ response: 10000, deadline: 15000 });
  if (cookieString) request.set("Cookie", cookieString);

  const response = await request;
  const $ = cheerio.load(response.text);
  const products = [];
  const seen = new Set();

  $(".ui-search-layout__item, .andes-card").each((_, el) => {
    const linkEl = $(el)
      .find(
        "a.poly-component__title, .poly-component__title a, .ui-search-item__group__element, .ui-search-result__wrapper a"
      )
      .first();
    const href = linkEl.attr("href");
    if (!href || href === "#") return;
    const productUrl = cleanUrl(href);
    if (!productUrl || seen.has(productUrl)) return;
    seen.add(productUrl);
    const sku = extractSkuFromUrl(productUrl);
    const name = $(el).find(".poly-component__title, .ui-search-item__title").first().text().trim();
    const imgEl = $(el).find("img").first();
    const image =
      imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-lazy") || "";
    // Use .poly-price__current to get the "por" (selling) price and avoid the
    // "de" (original/strikethrough) price that appears first in the DOM on discounted items.
    const priceWrapper = $(el).find(".poly-price__current").length
      ? $(el).find(".poly-price__current")
      : $(el);
    const fractionText = priceWrapper
      .find(".andes-money-amount__fraction")
      .first()
      .text()
      .trim()
      .replace(/\./g, "")
      .replace(/,/g, "");
    const centsText = priceWrapper.find(".andes-money-amount__cents").first().text().trim();
    const price = fractionText ? parseFloat(`${fractionText}.${centsText || "00"}`) : 0;
    if (productUrl && name) products.push({ url: productUrl, name, image, price, sku });
  });

  return { products, totalCount: parseTotalCount($) };
}

async function scrapeAllPages(baseUrl, ownerId) {
  const allProducts = [];
  const globalSeen = new Set();
  const MAX_PAGES = 200;

  const addProducts = (products) => {
    for (const p of products) {
      if (!globalSeen.has(p.url)) {
        globalSeen.add(p.url);
        allProducts.push(p);
      }
    }
  };

  const firstResult = await extractProductsFromPage(baseUrl, ownerId);
  addProducts(firstResult.products);
  const totalCount = firstResult.totalCount;
  const totalPages = totalCount ? Math.min(Math.ceil(totalCount / ML_PAGE_SIZE), MAX_PAGES) : MAX_PAGES;

  if (firstResult.products.length === 0) return allProducts;

  for (let page = 2; page <= totalPages; page++) {
    const pageUrl = buildPageUrl(baseUrl, page);
    await new Promise((r) => setTimeout(r, 600));
    let result;
    try {
      result = await extractProductsFromPage(pageUrl, ownerId);
    } catch (err) {
      console.error(`[SellerScraper] Erro na página ${page}:`, err.message);
      break;
    }
    if (result.products.length === 0) break;
    addProducts(result.products);
    if (!totalCount && result.products.length < ML_PAGE_SIZE) break;
  }

  return allProducts;
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
      scrapedProducts = await scrapeAllPages(seller.url, ownerId);
    } catch (err) {
      console.error(`[SellerScraper] Erro ao scrape seller ${seller._id}:`, err.message);
      return;
    }

    if (!scrapedProducts.length) {
      console.warn(`[SellerScraper] Nenhum produto para seller ${seller._id}`);
      return;
    }

    await SellerProduct.updateMany({ sellerId: seller._id }, { $set: { isNew: false, priceChanged: false } });

    for (const scraped of scrapedProducts) {
      const existing = await SellerProduct.findOne({ sellerId: seller._id, url: scraped.url });

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
