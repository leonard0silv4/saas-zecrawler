import axios from "axios";
import mongoose from "mongoose";
import Conta from "../models/Conta.js";
import { renewToken } from "./meliToken.js";

const ML_API = "https://api.mercadolibre.com";
const IN_STOCK = "https://schema.org/InStock";
const OUT_OF_STOCK = "https://schema.org/OutOfStock";

function activeContaFilter(extra = {}) {
  return {
    ...extra,
    access_token: { $exists: true },
    $or: [{ disabled: { $exists: false } }, { disabled: false }],
  };
}

/**
 * Returns a valid access token from one of ownerId's connected ML accounts, or null.
 * At least one connected account is required (free plan allows 1).
 */
export async function getOwnerMeliToken(ownerId) {
  const oid = new mongoose.Types.ObjectId(String(ownerId));
  const contas = await Conta.find(activeContaFilter({ ownerId: oid }));

  for (const conta of contas) {
    try {
      const token = await renewToken(conta);
      if (token) return token;
    } catch {
      /* try next account */
    }
  }
  return null;
}

/**
 * Identifies the ML id in a URL.
 * - Catalog: /p/MLB123 → { type: "product", id: "MLB123" }
 * - Item: produto.mercadolivre.com.br/MLB-123-... or ?item_id=MLB123 → { type: "item", id: "MLB123" }
 */
export function parseMeliUrl(raw) {
  const url = String(raw || "").trim().split("#")[0];
  const product = url.match(/\/p\/(MLB\d+)/i);
  if (product) return { type: "product", id: product[1].toUpperCase() };

  const itemParam = url.match(/[?&](?:item_id|wid)=(MLB-?\d+)/i);
  if (itemParam) return { type: "item", id: itemParam[1].replace("-", "").toUpperCase() };

  const item = url.match(/\b(MLB)-?(\d{6,})/i);
  if (item) return { type: "item", id: `MLB${item[2]}` };

  return null;
}

export async function mlGet(path, token, params) {
  const { data } = await axios.get(`${ML_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
    timeout: 15000,
  });
  return data;
}

const sellerCache = new Map();

/** Nickname + reputação do vendedor (cache em memória por processo). */
export async function fetchSeller(sellerId, token) {
  if (!sellerId) return { seller: "", ratingSeller: null };
  if (sellerCache.has(sellerId)) return sellerCache.get(sellerId);
  try {
    const u = await mlGet(`/users/${sellerId}`, token);
    const info = {
      seller: u.nickname || "",
      ratingSeller: u.seller_reputation?.level_id || null,
    };
    sellerCache.set(sellerId, info);
    return info;
  } catch {
    return { seller: "", ratingSeller: null };
  }
}

function pictureUrl(pictures, fallback) {
  const p = Array.isArray(pictures) ? pictures[0] : null;
  return p?.secure_url || p?.url || fallback || "";
}

async function fromCatalogProduct(id, token) {
  const product = await mlGet(`/products/${id}`, token);

  let winner = product.buy_box_winner || null;
  if (!winner) {
    try {
      const offers = await mlGet(`/products/${id}/items`, token, { limit: 50 });
      const results = (offers.results || []).filter((r) => Number(r.price) > 0);
      winner = results.sort((a, b) => a.price - b.price)[0] || null;
    } catch {
      /* product without active offers */
    }
  }

  const { seller, ratingSeller } = await fetchSeller(winner?.seller_id, token);

  return {
    sku: product.id,
    name: product.name,
    image: pictureUrl(product.pictures),
    offers: {
      price: Number(winner?.price || 0),
      availability: winner && product.status !== "inactive" ? IN_STOCK : OUT_OF_STOCK,
    },
    seller,
    ratingSeller,
    dateMl: product.date_created || "",
    full: winner?.shipping?.logistic_type === "fulfillment",
    catalog: true,
    storeName: "mercadolivre",
  };
}

async function fromItem(id, token) {
  const item = await mlGet(`/items/${id}`, token);
  const { seller, ratingSeller } = await fetchSeller(item.seller_id, token);

  return {
    sku: item.id,
    name: item.title,
    image: pictureUrl(item.pictures, item.secure_thumbnail || item.thumbnail),
    offers: {
      price: Number(item.price || 0),
      availability: item.status === "active" ? IN_STOCK : OUT_OF_STOCK,
    },
    seller,
    ratingSeller,
    dateMl: item.start_time || item.date_created || "",
    full: item.shipping?.logistic_type === "fulfillment",
    catalog: Boolean(item.catalog_listing),
    storeName: "mercadolivre",
  };
}

/**
 * Fetches product data for a Mercado Livre URL through the official API.
 * Throws { code: "NO_ACCOUNT" } when no connected ML account is available
 * and { code: "UNSUPPORTED_URL" } when no MLB id is found in the URL.
 */
export async function fetchMeliProduct(url, ownerId, token) {
  const parsed = parseMeliUrl(url);
  if (!parsed) throw Object.assign(new Error("URL sem código MLB"), { code: "UNSUPPORTED_URL" });

  const accessToken = token || (await getOwnerMeliToken(ownerId));
  if (!accessToken) throw Object.assign(new Error("Nenhuma conta ML conectada"), { code: "NO_ACCOUNT" });

  return parsed.type === "product"
    ? fromCatalogProduct(parsed.id, accessToken)
    : fromItem(parsed.id, accessToken);
}

/**
 * Converts a ML listing / store URL into /sites/MLB/search params.
 * Supports: _CustId_123 (seller), /perfil/NICK or /pagina/NICK (seller nickname),
 * ?q=termo and lista.mercadolivre.com.br/<termo>. Returns null when nothing usable is found.
 */
export function parseListingUrl(raw) {
  let u;
  try {
    u = new URL(String(raw || "").trim().split("#")[0]);
  } catch {
    return null;
  }
  const params = {};
  const path = decodeURIComponent(u.pathname);

  const custId = path.match(/_CustId_(\d+)/i);
  if (custId) params.seller_id = custId[1];

  const nick = path.match(/\/(?:perfil|pagina)\/([^/_]+)/i);
  if (nick && !params.seller_id) params.nickname = nick[1];

  const q = u.searchParams.get("q");
  if (q) {
    params.q = q;
  } else if (/lista\.mercadolivre|lista\.mercadolibre/i.test(u.hostname)) {
    const segments = path.split("/").filter((seg) => seg && !seg.startsWith("_"));
    const term = (segments[segments.length - 1] || "").split("_")[0].replace(/-/g, " ").trim();
    if (term) params.q = term;
  }

  return Object.keys(params).length ? params : null;
}

/**
 * Paginated /sites/MLB/search. Public search caps offset at 1000.
 */
export async function searchMeliItems(params, token, { maxResults = 1000 } = {}) {
  const PAGE = 50;
  const results = [];
  let offset = 0;
  let total = Infinity;

  while (offset < Math.min(total, maxResults)) {
    const data = await mlGet("/sites/MLB/search", token, { ...params, limit: PAGE, offset });
    total = data.paging?.total ?? 0;
    const page = data.results || [];
    results.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return results;
}

/**
 * All offers of a catalog product (/products/{id}/items), paginated.
 */
export async function fetchCatalogOffers(productId, token, { maxResults = 200 } = {}) {
  const PAGE = 50;
  const offers = [];
  let offset = 0;

  while (offset < maxResults) {
    let data;
    try {
      data = await mlGet(`/products/${productId}/items`, token, { limit: PAGE, offset });
    } catch (err) {
      if (err.response?.status === 404) break; // produto sem ofertas ativas
      throw err;
    }
    const page = data.results || [];
    offers.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return offers;
}

/** Permalink canônico de um anúncio a partir do id. */
export function itemPermalink(itemId) {
  const num = String(itemId || "").replace(/^MLB-?/i, "");
  return `https://produto.mercadolivre.com.br/MLB-${num}`;
}

/**
 * Lists product permalinks for a listing URL via search API.
 */
export async function searchMeliListing(listUrl, ownerId) {
  const token = await getOwnerMeliToken(ownerId);
  if (!token) throw Object.assign(new Error("Nenhuma conta ML conectada"), { code: "NO_ACCOUNT" });

  const params = parseListingUrl(listUrl);
  if (!params) return [];

  const results = await searchMeliItems(params, token, { maxResults: 50 });
  return results.map((r) => r.permalink).filter(Boolean);
}

/** Search terms from a ML URL slug (/slug/p/…, /slug/up/…, produto.mercadolivre.com.br/MLB-123-slug-_JM). */
export function searchQueryFromUrl(raw) {
  let path;
  try {
    path = decodeURIComponent(new URL(String(raw).trim()).pathname);
  } catch {
    return "";
  }
  const seg = path.split("/").filter(Boolean);
  const idx = seg.findIndex((s) => s === "p" || s === "up");
  let slug = idx > 0 ? seg[idx - 1] : seg[0] || "";
  slug = slug.replace(/^MLB-?\d+-?/i, "").replace(/-_JM$/i, "");
  return slug.replace(/[-_]+/g, " ").trim();
}

/**
 * Catalog products similar to `q` (/products/search), with buy box (or lowest offer) price and seller,
 * so the user can pick one to replace a listing the API does not expose.
 */
export async function suggestCatalogProducts(q, token, { limit = 5 } = {}) {
  const query = String(q || "").trim().slice(0, 120);
  if (!query) return [];

  const data = await mlGet("/products/search", token, { site_id: "MLB", q: query, status: "active", limit });
  const suggestions = [];
  for (const r of (data.results || []).slice(0, limit)) {
    try {
      const p = await fromCatalogProduct(r.id, token);
      suggestions.push({
        id: p.sku,
        name: p.name,
        image: p.image,
        price: p.offers.price,
        seller: p.seller,
        permalink: `https://www.mercadolivre.com.br/p/${p.sku}`,
      });
    } catch {
      /* skip product that failed to load */
    }
  }
  return suggestions;
}
