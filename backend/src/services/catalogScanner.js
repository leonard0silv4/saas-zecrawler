/**
 * Varredura de catálogos do Mercado Livre por owner (base do Monitor de Sellers).
 *
 * A API oficial não permite listar anúncios de outro vendedor (/users/{id}/items/search e
 * /sites/MLB/search respondem 403), mas permite listar todos os vendedores de um produto de
 * catálogo (/products/{id}/items). Então varremos um universo de catálogos relevantes para o
 * owner e guardamos as ofertas em CatalogScan:
 *   1. catálogos dos anúncios das contas ML conectadas (own)
 *   2. produtos de catálogo cadastrados em Links (link)
 *   3. mais vendidos das categorias escolhidas (category)
 */
import mongoose from "mongoose";
import Conta from "../models/Conta.js";
import Link from "../models/Link.js";
import CatalogScan from "../models/CatalogScan.js";
import CatalogScanState from "../models/CatalogScanState.js";
import { renewToken } from "../utils/meliToken.js";
import { getOwnerMeliToken, mlGet, fetchCatalogOffers } from "../utils/meliProductApi.js";

export const MAX_CATALOGS_PER_SCAN = 300;
export const MAX_CATEGORIES = 5;
const MAX_OWN_ITEMS = 1000;
const REQUEST_GAP_MS = 250;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const runningOwners = new Set();

/** mlGet com espera e nova tentativa em 429 (limite de requisições do ML). */
async function mlGetRetry(path, token, params, attempts = 4) {
  for (let i = 0; ; i++) {
    try {
      return await mlGet(path, token, params);
    } catch (err) {
      if (err.response?.status !== 429 || i >= attempts - 1) throw err;
      await sleep(2000 * (i + 1));
    }
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** catalog_product_id dos anúncios ativos das contas ML conectadas do owner. */
async function ownCatalogIds(ownerId) {
  const contas = await Conta.find({
    ownerId,
    access_token: { $exists: true },
    $or: [{ disabled: { $exists: false } }, { disabled: false }],
  });

  const ids = new Set();
  for (const conta of contas) {
    let token;
    try {
      token = await renewToken(conta);
    } catch {
      continue;
    }

    const itemIds = [];
    let scrollId = null;
    while (itemIds.length < MAX_OWN_ITEMS) {
      const params = { status: "active", search_type: "scan", limit: 100, ...(scrollId ? { scroll_id: scrollId } : {}) };
      const data = await mlGetRetry(`/users/${conta.user_id}/items/search`, token, params);
      const page = data.results || [];
      itemIds.push(...page);
      scrollId = data.scroll_id;
      if (!page.length || !scrollId) break;
    }

    for (const group of chunk(itemIds.slice(0, MAX_OWN_ITEMS), 20)) {
      const rows = await mlGetRetry("/items", token, { ids: group.join(","), attributes: "id,catalog_product_id" });
      for (const row of rows || []) {
        const cp = row?.body?.catalog_product_id;
        if (row?.code === 200 && cp) ids.add(cp);
      }
      await sleep(REQUEST_GAP_MS);
    }
  }
  return ids;
}

async function linkCatalogIds(ownerId) {
  const links = await Link.find({ ownerId, link: /\/p\/MLB\d+/i }).select("link").lean();
  const ids = new Set();
  for (const l of links) {
    const m = l.link.match(/\/p\/(MLB\d+)/i);
    if (m) ids.add(m[1].toUpperCase());
  }
  return ids;
}

async function categoryCatalogIds(categories, token) {
  const ids = new Set();
  for (const { id: cat } of categories.slice(0, MAX_CATEGORIES)) {
    try {
      const data = await mlGetRetry(`/highlights/MLB/category/${cat}`, token);
      for (const c of data.content || []) if (c.type === "PRODUCT") ids.add(c.id);
    } catch (err) {
      console.warn(`[CatalogScanner] highlights ${cat}: ${err.response?.status || err.message}`);
    }
    await sleep(REQUEST_GAP_MS);
  }
  return ids;
}

/** Nicknames via multiget /users?ids= (20 por chamada). */
async function fetchNicknames(sellerIds, token) {
  const map = new Map();
  for (const group of chunk([...sellerIds], 20)) {
    try {
      const rows = await mlGetRetry("/users", token, { ids: group.join(",") });
      for (const row of rows || []) {
        if (row?.code === 200 && row.body?.id) map.set(row.body.id, row.body.nickname || "");
      }
    } catch (err) {
      console.warn(`[CatalogScanner] users multiget: ${err.response?.status || err.message}`);
    }
    await sleep(REQUEST_GAP_MS);
  }
  return map;
}

export function isOwnerScanRunning(ownerId) {
  return runningOwners.has(String(ownerId));
}

/**
 * Varre os catálogos do owner e atualiza CatalogScan.
 * Retorna o estado final (ou null quando não há conta ML conectada / já está rodando).
 */
export async function scanOwnerCatalogs(ownerId) {
  const key = String(ownerId);
  if (runningOwners.has(key)) return null;
  runningOwners.add(key);

  const oid = new mongoose.Types.ObjectId(key);
  const state = await CatalogScanState.findOneAndUpdate(
    { ownerId: oid },
    { $set: { running: true, startedAt: new Date(), lastError: null } },
    { upsert: true, new: true }
  );

  try {
    const token = await getOwnerMeliToken(oid);
    if (!token) {
      await CatalogScanState.updateOne({ ownerId: oid }, { $set: { lastError: "NO_ACCOUNT" } });
      return null;
    }

    // Prioridade: próprios anúncios > links > mais vendidos (corte em MAX_CATALOGS_PER_SCAN)
    const sources = new Map();
    const add = (ids, source) => {
      for (const id of ids) {
        if (!sources.has(id)) {
          if (sources.size >= MAX_CATALOGS_PER_SCAN) return;
          sources.set(id, new Set());
        }
        sources.get(id).add(source);
      }
    };
    add(await ownCatalogIds(oid), "own");
    add(await linkCatalogIds(oid), "link");
    add(await categoryCatalogIds(state.categories || [], token), "category");

    const scanned = [];
    for (const [productId, src] of sources) {
      try {
        const product = await mlGetRetry(`/products/${productId}`, token);
        await sleep(REQUEST_GAP_MS);
        const offers = await fetchCatalogOffers(productId, token, { maxResults: 100 });
        await sleep(REQUEST_GAP_MS);
        scanned.push({
          productId,
          name: product.name || "",
          image: product.pictures?.[0]?.secure_url || product.pictures?.[0]?.url || "",
          winnerSellerId: product.buy_box_winner?.seller_id ?? null,
          sources: [...src],
          offers: offers
            .filter((o) => o.seller_id && o.item_id)
            .map((o) => ({
              sellerId: o.seller_id,
              itemId: o.item_id,
              price: Number(o.price) || 0,
              full: o.shipping?.logistic_type === "fulfillment",
            })),
        });
      } catch (err) {
        console.warn(`[CatalogScanner] ${productId}: ${err.response?.status || err.message}`);
      }
    }

    const sellerIds = new Set(scanned.flatMap((s) => s.offers.map((o) => o.sellerId)));
    const nicknames = await fetchNicknames(sellerIds, token);
    const now = new Date();

    if (scanned.length) {
      await CatalogScan.bulkWrite(
        scanned.map((s) => ({
          updateOne: {
            filter: { ownerId: oid, productId: s.productId },
            update: {
              $set: {
                ...s,
                offers: s.offers.map((o) => ({ ...o, nickname: nicknames.get(o.sellerId) || "" })),
                scannedAt: now,
              },
            },
            upsert: true,
          },
        }))
      );
    }
    // Catálogos que saíram do universo (ex.: categoria removida) não ficam mais visíveis
    await CatalogScan.deleteMany({ ownerId: oid, productId: { $nin: [...sources.keys()] } });

    return await CatalogScanState.findOneAndUpdate(
      { ownerId: oid },
      { $set: { lastRunAt: now, catalogCount: scanned.length, sellerCount: sellerIds.size } },
      { new: true }
    );
  } catch (err) {
    console.error(`[CatalogScanner] owner ${key}:`, err.response?.status || err.message);
    await CatalogScanState.updateOne({ ownerId: oid }, { $set: { lastError: err.message } });
    return null;
  } finally {
    await CatalogScanState.updateOne({ ownerId: oid }, { $set: { running: false, startedAt: null } });
    runningOwners.delete(key);
  }
}

/**
 * Concorrentes encontrados na última varredura (exclui as contas ML do próprio owner).
 * cheapest = em quantos catálogos o vendedor tem a oferta de menor preço
 * (buy_box_winner quase nunca vem em /products, por isso não é usado).
 */
export async function listCompetitors(ownerId) {
  const oid = new mongoose.Types.ObjectId(String(ownerId));
  const ownIds = (await Conta.find({ ownerId: oid }).select("user_id").lean()).map((c) => c.user_id);

  return CatalogScan.aggregate([
    { $match: { ownerId: oid } },
    { $addFields: { minPrice: { $min: "$offers.price" } } },
    { $unwind: "$offers" },
    { $match: { "offers.sellerId": { $nin: ownIds } } },
    // 1 linha por (catálogo, vendedor): um vendedor pode ter várias ofertas no mesmo catálogo
    {
      $group: {
        _id: { productId: "$productId", sellerId: "$offers.sellerId" },
        nickname: { $last: "$offers.nickname" },
        cheapest: { $max: { $cond: [{ $and: [{ $gt: ["$offers.price", 0] }, { $eq: ["$offers.price", "$minPrice"] }] }, 1, 0] } },
      },
    },
    {
      $group: {
        _id: "$_id.sellerId",
        nickname: { $last: "$nickname" },
        catalogCount: { $sum: 1 },
        cheapest: { $sum: "$cheapest" },
      },
    },
    { $project: { _id: 0, sellerId: "$_id", nickname: 1, catalogCount: 1, cheapest: 1 } },
    { $sort: { catalogCount: -1, cheapest: -1 } },
    { $limit: 500 },
  ]);
}
