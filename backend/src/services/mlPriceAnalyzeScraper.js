/**
 * Análise de Preços — coleta via API oficial do Mercado Livre.
 * (Scraping de HTML foi abandonado em set/2026: o ML passou a responder com
 * captcha wall / bot challenge para requisições server-side.)
 */
import {
  getOwnerMeliToken,
  parseMeliUrl,
  parseListingUrl,
  searchMeliItems,
  fetchCatalogOffers,
  fetchSeller,
  itemPermalink,
  mlGet,
} from "../utils/meliProductApi.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function extractMlbFromUrl(url) {
  const m = String(url || "").match(/MLB[-]?(\d{8,14})/i);
  return m ? `MLB${m[1]}` : "N/A";
}

export function extractCatalogGrupo(url) {
  const m = String(url || "").split("?")[0].match(/\/p\/(MLB\d+)/i);
  return m ? m[1] : "";
}

/** URL de listagem/busca (lista.mercadolivre, ?q=, _CustId_, perfil de vendedor). */
export function isListingUrl(url) {
  const u = String(url || "");
  if (/\/p\/MLB\d+/i.test(u)) return false;
  if (/produto\.mercadolivre\.com\.br\/MLB/i.test(u)) return false;
  return /lista\.mercadolivre|[?&]q=|_CustId_|\/perfil\/|\/pagina\//i.test(u);
}

export function classifyMercadoLivreUrl(url) {
  const u = String(url || "").toLowerCase();
  if (!u.includes("mercadolivre") && !u.includes("mercadolibre.com")) return "skip";
  if (extractCatalogGrupo(url)) return "catalog";
  if (isListingUrl(url)) return "listing";
  return "item";
}

function row({ nome, preco, vendedor, id, url, urlOriginal, grupo }) {
  const price = Number(preco) > 0 ? Number(preco) : -1;
  const name = nome || "N/A";
  const seller = vendedor || "N/A";
  return {
    nome: name,
    preco: price,
    vendedor: seller,
    id_produto: id || "N/A",
    url,
    url_original: urlOriginal || url,
    grupo: grupo || id || "sem-grupo",
    status: name === "N/A" ? "ERRO_NOME" : price < 0 ? "ERRO_PRECO" : seller === "N/A" ? "ERRO_VENDEDOR" : "OK",
  };
}

/** Todas as ofertas de um produto de catálogo (/p/MLB…, com ou sem /s). */
async function catalogRows(productId, urlOriginal, token) {
  const product = await mlGet(`/products/${productId}`, token);
  const offers = await fetchCatalogOffers(productId, token);

  const rows = [];
  for (const offer of offers) {
    const { seller } = await fetchSeller(offer.seller_id, token);
    rows.push(row({
      nome: product.name,
      preco: offer.price,
      vendedor: seller,
      id: offer.item_id,
      url: itemPermalink(offer.item_id),
      urlOriginal,
      grupo: productId,
    }));
  }

  // Sem ofertas listadas: usa o buy box winner do próprio produto
  if (!rows.length && product.buy_box_winner) {
    const w = product.buy_box_winner;
    const { seller } = await fetchSeller(w.seller_id, token);
    rows.push(row({
      nome: product.name,
      preco: w.price,
      vendedor: seller,
      id: w.item_id,
      url: itemPermalink(w.item_id),
      urlOriginal,
      grupo: productId,
    }));
  }
  return rows;
}

async function itemRows(itemId, urlOriginal, token) {
  const item = await mlGet(`/items/${itemId}`, token);
  const { seller } = await fetchSeller(item.seller_id, token);
  return [row({
    nome: item.title,
    preco: item.price,
    vendedor: seller,
    id: item.id,
    url: item.permalink || itemPermalink(item.id),
    urlOriginal,
    grupo: item.catalog_product_id || item.id,
  })];
}

async function listingRows(url, token) {
  const params = parseListingUrl(url);
  if (!params) return [];
  const results = await searchMeliItems(params, token, { maxResults: 200 });

  const rows = [];
  for (const r of results) {
    const vendedor = r.seller?.nickname || (await fetchSeller(r.seller?.id, token)).seller;
    rows.push(row({
      nome: r.title,
      preco: r.price,
      vendedor,
      id: r.id,
      url: r.permalink || itemPermalink(r.id),
      urlOriginal: url,
      grupo: r.catalog_product_id || r.id,
    }));
  }
  return rows;
}

/**
 * @param {Array<{ link: string }>} linkDocs - documentos Link (campo link = URL)
 * @param {string} ownerId
 * @param {{ onProgress?: (p: { current: number, total: number, url: string }) => void }} opts
 */
export async function scrapePriceAnalyzeFromLinks(linkDocs, ownerId, opts = {}) {
  const { onProgress } = opts;
  const token = await getOwnerMeliToken(ownerId);
  if (!token) {
    throw Object.assign(new Error("Conecte uma conta do Mercado Livre para gerar a análise."), { code: "NO_ACCOUNT" });
  }

  const results = [];
  const total = linkDocs.length;

  for (let i = 0; i < linkDocs.length; i++) {
    const url = linkDocs[i].link;
    onProgress?.({ current: i + 1, total, url });
    if (i > 0) await sleep(150);

    try {
      const kind = classifyMercadoLivreUrl(url);
      if (kind === "skip") continue;

      if (kind === "catalog") {
        results.push(...(await catalogRows(extractCatalogGrupo(url), url, token)));
      } else if (kind === "listing") {
        results.push(...(await listingRows(url, token)));
      } else {
        const parsed = parseMeliUrl(url);
        if (parsed) results.push(...(await itemRows(parsed.id, url, token)));
      }
    } catch (err) {
      const detail = err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : err.message;
      console.error(`[mlPriceAnalyze] ${url}: ${detail}`);
    }
  }

  return results.filter((r) => r.preco > 0);
}
