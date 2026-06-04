import superagent from "superagent";
import * as cheerio from "cheerio";
import { loadCookiesWithFallback } from "./cookieLoader.js";

/**
 * Scrapes product data from a Mercado Livre URL.
 * Retries up to maxRetries times on failure.
 */
export async function scrapeProductData(url, ownerId, maxRetries = 3) {
  const { cookieString } = await loadCookiesWithFallback(ownerId);
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const request = superagent.get(url).timeout({ response: 5000, deadline: 10000 });
      if (cookieString) request.set("Cookie", cookieString);

      const response = await request;
      const $ = cheerio.load(response.text);

      // Extract JSON-LD product data
      let productData = null;
      $('script[type="application/ld+json"]').each((_, el) => {
        const content = $(el).html();
        if (content?.includes('"@type":"Product"')) {
          productData = JSON.parse(content);
        }
      });

      const seller = $(".ui-pdp-container__row .ui-pdp-seller__link-trigger-button a").first().text()
        || $("div.ui-pdp-seller__link-trigger.non-selectable").text();

      const full = $('[href="#full_icon"]').length > 0;
      const catalog = $(".ui-pdp-other-sellers-item__buybox").length > 0;
      const buyActive = $('[formaction="https://www.mercadolivre.com.br/gz/checkout/buy"]').length > 0;
      const paused = $(".ui-pdp-message.ui-vpp-message .andes-message__content").length > 0;

      // Extract startTime
      let dateMl = "";
      $("script").each((_, el) => {
        const match = $(el).html()?.match(/"startTime":"([^"]+)"/);
        if (match) { dateMl = match[1]; return false; }
      });

      // Extract SKU
      let sku = "";
      $("script").each((_, el) => {
        const match = $(el).html()?.match(/"sku":"([^"]+)"/);
        if (match) { sku = match[1]; return false; }
      });

      // Extract rating
      let ratingSeller = null;
      if (productData?.offers?.seller?.aggregateRating?.ratingValue) {
        ratingSeller = productData.offers.seller.aggregateRating.ratingValue;
      }

      // Build result
      let result;
      if (productData) {
        if (paused) productData.offers.availability = "https://schema.org/OutOfStock";
        result = productData;
      } else {
        const imgSrc = $(".ui-pdp-gallery__figure img").attr("src");
        result = {
          offers: {
            price: $('[itemprop="price"]').attr("content"),
            availability: buyActive ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
          sku,
          name: $(".ui-pdp-title").text(),
          image: imgSrc,
        };
      }

      return {
        ...result,
        sku: result.sku || result.productID || sku,
        seller: seller || result?.offers?.seller?.name || "",
        dateMl,
        storeName: "mercadolivre",
        ratingSeller,
        full,
        catalog,
      };
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) {
        console.error(`[scraper] Failed after ${maxRetries} attempts: ${url}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

/**
 * Extracts product links from a search/category page.
 */
export async function extractLinks(url, ownerId) {
  try {
    const { cookieString } = await loadCookiesWithFallback(ownerId);
    const request = superagent.get(url).timeout({ response: 5000, deadline: 10000 });
    if (cookieString) request.set("Cookie", cookieString);

    const response = await request;
    const $ = cheerio.load(response.text);

    const links = [];
    $(".ui-search-result__wrapper a").each((_, el) => {
      const href = $(el).attr("href")?.split("#")[0];
      if (href) links.push(href);
    });

    return links;
  } catch (err) {
    console.error("[scraper] extractLinks error:", err.message);
    return [];
  }
}
