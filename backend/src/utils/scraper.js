import { fetchMeliProduct, searchMeliListing } from "./meliProductApi.js";

export { getOwnerMeliToken } from "./meliProductApi.js";

/**
 * Fetches product data for a Mercado Livre URL via the official ML API
 * (HTML scraping is blocked by captcha / bot challenge since set/2026).
 * Retries up to maxRetries times on transient failures.
 *
 * Returns the product, null on failure, or { error: "NO_ACCOUNT" | "UNSUPPORTED_URL" | "NOT_FOUND" }.
 * Pass `token` to reuse one access token across many calls (refresh/cron).
 */
export async function scrapeProductData(url, ownerId, maxRetries = 3, token) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await fetchMeliProduct(url, ownerId, token);
    } catch (err) {
      if (err.code === "NO_ACCOUNT" || err.code === "UNSUPPORTED_URL") return { error: err.code };
      if (err.response?.status === 404) return { error: "NOT_FOUND" };

      attempt++;
      if (attempt >= maxRetries) {
        const detail = err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : err.message;
        console.error(`[scraper] Failed after ${maxRetries} attempts: ${url} (${detail})`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

/**
 * Extracts product links from a search/listing page (via ML search API).
 */
export async function extractLinks(url, ownerId) {
  try {
    return await searchMeliListing(url, ownerId);
  } catch (err) {
    console.error("[scraper] extractLinks error:", err.response?.status || err.message);
    return [];
  }
}
