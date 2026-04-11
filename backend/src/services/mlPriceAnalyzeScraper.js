import superagent from "superagent";
import * as cheerio from "cheerio";
import mongoose from "mongoose";
import Cookie from "../models/Cookie.js";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
];

function pickUa() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadCookieString(ownerId) {
  const oid = new mongoose.Types.ObjectId(String(ownerId));
  const cookies = await Cookie.find({ ownerId: oid }).lean();
  const fromDb = cookies.length ? cookies.map((c) => `${c.name}=${c.value}`).join("; ") : "";
  const fromEnv = (process.env.ML_COOKIE_STRING || "").trim();
  if (!fromDb) return fromEnv;
  if (!fromEnv) return fromDb;
  return `${fromDb}; ${fromEnv}`;
}

export function normalizePriceText(text) {
  if (!text) return -1;
  let t = String(text)
    .replace(/R\$/gi, "")
    .replace(/\u00a0/g, "")
    .trim()
    .replace(/\s/g, "");
  t = t.replace(/[^\d.,]/g, "");
  if (!t) return -1;
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (t.includes(".")) {
    const parts = t.split(".");
    if (parts[parts.length - 1].length > 2) t = parts.join("");
  }
  const n = parseFloat(t);
  return Number.isFinite(n) && n > 0 ? n : -1;
}

export function extractMlbFromUrl(url) {
  const m = url.match(/MLB[-]?(\d{8,14})/i);
  return m ? `MLB${m[1]}` : "N/A";
}

export function extractCatalogGrupo(url) {
  const m = url.split("?")[0].match(/\/p\/(MLB\d+)/i);
  return m ? m[1] : "";
}

/** Página de catálogo /p/MLB…/s (slug pode ter hífen após o ID) */
export function isCatalogSUrl(url) {
  const path = url.split("?")[0].replace(/\/+$/, "");
  return /mercadolivre\.com\.br\/p\/MLB/i.test(path) && /\/s$/i.test(path);
}

export function catalogStripS(url) {
  return url.split("?")[0].replace(/\/s\/?$/i, "");
}

/**
 * Página de produto de catálogo sem /s → mesma URL com /s (comparador de vendedores).
 * Só www.mercadolivre.com.br/.../p/MLB123... (não altera produto.mercadolivre nem /up/).
 */
export function catalogProductUrlToCompareUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!host.endsWith("mercadolivre.com.br") && !host.endsWith("mercadolibre.com")) return null;
    if (!/^www\.mercadolivre\.com\.br$/i.test(host)) return null;
    const path = u.pathname.replace(/\/+$/, "");
    if (!/\/p\/MLB\d+/i.test(path)) return null;
    if (/\/s$/i.test(path)) return null;
    return `${u.origin}${path}/s${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

/** Parece página de um único anúncio (não listagem). */
export function isLikelySingleItemUrl(url) {
  const path = url.split(/[?#]/)[0];
  if (/produto\.mercadolivre\.com\.br\/MLB/i.test(path)) return true;
  if (/mercadolivre\.com\.br\/up\/MLB/i.test(path)) return true;
  // Catálogo sem /s final = landing do produto, não tabela de vendedores
  if (/\/p\/MLB/i.test(path) && !/\/s$/i.test(path.replace(/\/+$/, ""))) return true;
  return false;
}

/**
 * URLs de busca/listagem como no Python (_extrai_produtos_da_listagem).
 * Inclui lista.mercadolivre, _NoIndex_True (listagens de loja), ?q=, /c/, loja etc.
 */
export function isListingUrl(url) {
  const u = url.toLowerCase();
  if (!u.includes("mercadolivre") && !u.includes("mercadolibre.com")) return false;
  if (isCatalogSUrl(url)) return false;
  if (isLikelySingleItemUrl(url) && !/_NoIndex_True/i.test(url)) return false;

  if (/lista\.mercadolivre\.com\.br/.test(u)) return true;
  if (/\/s\?/.test(u)) return true;
  if (/[?&]q=/.test(u)) return true;
  if (/_NoIndex_True/i.test(url)) return true;
  if (/mercadolivre\.com\.br\/(c\/|listagem|lista\/|sec\/)/i.test(u)) return true;
  if (/loja\.mercadolivre|\/perfil\/|\/tienda\//i.test(u)) return true;
  return false;
}

/** Conta blocos de resultado de busca (UI clássica + layout poly). */
export function countSearchResultBlocks($) {
  const a = $("li.ui-search-layout__item").length;
  const b = $("div.ui-search-result__wrapper").length;
  const c = $("li[class*='poly-component']").length;
  const d = $("div[class*='poly-card']").length;
  const e = $("div.andes-card").filter((_, el) => {
    const href = $(el).find('a[href*="MLB"]').attr("href");
    return !!href;
  }).length;
  return Math.max(a, b) > 0 ? a + b : c + d > 0 ? c + d : e;
}

export function classifyMercadoLivreUrl(url) {
  const u = url.toLowerCase();
  if (!u.includes("mercadolivre") && !u.includes("mercadolibre.com")) return "skip";
  if (isCatalogSUrl(url)) return "catalog";
  if (isListingUrl(url)) return "listing";
  return "item";
}

function absolutizeMlHref(href) {
  if (!href) return "";
  const h = href.split("#")[0];
  if (h.startsWith("http")) return h;
  if (h.startsWith("//")) return `https:${h}`;
  const base = "https://www.mercadolivre.com.br";
  return `${base}${h.startsWith("/") ? "" : "/"}${h}`;
}

function refererForMlUrl(targetUrl) {
  try {
    const u = new URL(targetUrl);
    if (/mercadolivre\.com\.br|mercadolibre\.com/i.test(u.hostname)) {
      return `${u.protocol}//${u.host}/`;
    }
  } catch {
    /* ignore */
  }
  return "https://www.mercadolivre.com.br/";
}

function mlBrowserHeaders(targetUrl, referer) {
  let secFetchSite = "none";
  try {
    const t = new URL(targetUrl);
    if (referer) {
      const r = new URL(referer);
      secFetchSite = t.origin === r.origin ? "same-origin" : "cross-site";
    }
  } catch {
    /* ignore */
  }
  return {
    "User-Agent": pickUa(),
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    Referer: referer,
    "Cache-Control": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": secFetchSite,
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };
}

function applyMlBrowserHeaders(req, targetUrl, referer) {
  const h = mlBrowserHeaders(targetUrl, referer);
  Object.entries(h).forEach(([k, v]) => req.set(k, v));
}

/**
 * @param {string} url
 * @param {string} ownerId
 * @param {{ referer?: string }} [options] - Referer explícito (ex.: PDP sem /s ao buscar /s)
 */
export async function fetchMlHtml(url, ownerId, options = {}) {
  const cookieString = await loadCookieString(ownerId);
  const referer = options.referer != null ? options.referer : refererForMlUrl(url);
  const req = superagent.get(url).timeout({ response: 25000, deadline: 40000 });
  applyMlBrowserHeaders(req, url, referer);
  if (cookieString) req.set("Cookie", cookieString);
  const res = await req;
  return res.text;
}

/**
 * Uma linha de produto no mesmo espírito do Python ProdutoMercadoLivre.
 */
export function parseSingleProductFromSoup($, url, urlOriginal) {
  let nome = $("h1.ui-pdp-title").first().text().trim();
  if (!nome) {
    const og = $('meta[property="og:title"]').attr("content");
    nome = og ? og.replace(/\s*\|\s*MercadoLivre.*/i, "").trim() : "N/A";
  }
  if (!nome) nome = "N/A";

  let preco = -1;
  const pricePart = $('span[data-testid="price-part"]').first();
  const metaInPart = pricePart.find('meta[itemprop="price"]').attr("content");
  if (metaInPart) preco = normalizePriceText(metaInPart);
  if (preco < 0) {
    const fr = pricePart.find("span.andes-money-amount__fraction").first().text().trim();
    const ct = pricePart.find("span.andes-money-amount__cents").first().text().trim();
    if (fr) preco = normalizePriceText(ct ? `${fr},${ct}` : fr);
  }
  if (preco < 0) {
    const metas = $('meta[itemprop="price"]');
    metas.each((_, el) => {
      const c = $(el).attr("content");
      if (c && preco < 0) preco = normalizePriceText(c);
    });
  }
  if (preco < 0) {
    const fr = $("span.andes-money-amount__fraction").first().text().trim();
    const ct = $("span.andes-money-amount__cents").first().text().trim();
    if (fr) preco = normalizePriceText(ct ? `${fr},${ct}` : fr);
  }

  let vendedor = "N/A";
  const btn = $("button.ui-pdp-seller__link-trigger-button").first();
  if (btn.length) {
    const spans = btn.find("span");
    spans.each((_, el) => {
      const cl = $(el).attr("class") || "";
      if (cl.includes("ui-pdp-seller__label-sold")) return;
      const tx = $(el).text().trim();
      if (tx && tx.length > 1 && !/^vendido por$/i.test(tx)) {
        vendedor = tx;
        return false;
      }
    });
    if (vendedor === "N/A") {
      let full = btn.text().replace(/\s+/g, " ").trim();
      if (/vendido por/i.test(full)) vendedor = full.split(/vendido por/i).pop().trim();
      else vendedor = full;
    }
  }
  vendedor = vendedor.replace(/vendido por/gi, "").trim() || "N/A";

  const id_produto = extractMlbFromUrl(url);
  const grupo = extractCatalogGrupo(url) || id_produto;

  return {
    nome,
    preco,
    vendedor,
    id_produto,
    url,
    url_original: urlOriginal || url,
    grupo,
    status: nome === "N/A" ? "ERRO_NOME" : preco < 0 ? "ERRO_PRECO" : vendedor === "N/A" ? "ERRO_VENDEDOR" : "OK",
  };
}

/**
 * Extrai múltiplos produtos de listagem (Python: _extrai_produtos_da_listagem).
 * Suporta ui-search-* e layout poly-component / poly-card (ML 2024+).
 */
export function parseListingPage($, pageUrl, urlOriginal) {
  const out = [];
  const seen = new Set();
  const push = (row) => {
    const key = `${row.url}|${row.preco}|${row.nome?.slice(0, 40)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(row);
  };

  let blocks = $("li.ui-search-layout__item");
  if (!blocks.length) blocks = $("div.ui-search-result__wrapper");
  if (!blocks.length) blocks = $("li[class*='poly-component']");
  if (!blocks.length) blocks = $("div[class*='poly-card']");
  if (!blocks.length) {
    blocks = $("div.andes-card").filter((_, el) => $(el).find('a[href*="MLB"]').length > 0);
  }

  blocks.each((_, el) => {
    const $el = $(el);

    let linkEl = $el.find("a.poly-component__title").first();
    if (!linkEl.length) linkEl = $el.find(".poly-component__title a").first();
    if (!linkEl.length) linkEl = $el.find("h2.ui-search-item__title a").first();
    if (!linkEl.length) linkEl = $el.find("h3.poly-component__title a").first();
    if (!linkEl.length) linkEl = $el.find("a.ui-search-item__group__element").first();
    if (!linkEl.length) linkEl = $el.find('a[href*="MLB"]').filter((_, a) => /MLB-?\d+/i.test($(a).attr("href") || "")).first();
    if (!linkEl.length) return;

    const rawHref = linkEl.attr("href") || "";
    const href = absolutizeMlHref(rawHref);
    if (!href || !/MLB-?\d+/i.test(href)) return;

    let nome = linkEl.text().replace(/\s+/g, " ").trim();
    if (!nome) nome = $el.find("h2.ui-search-item__title").first().text().trim();
    if (!nome) nome = $el.find(".poly-component__title").first().text().trim();
    if (!nome) nome = "N/A";

    let fr = $el.find("span.andes-money-amount__fraction").first().text().trim();
    let ct = $el.find("span.andes-money-amount__cents").first().text().trim();
    if (!fr) {
      const amt = $el.find("[class*='andes-money-amount']").first();
      fr = amt.find(".andes-money-amount__fraction, span[class*='fraction']").first().text().trim();
      ct = amt.find(".andes-money-amount__cents, span[class*='cents']").first().text().trim();
    }
    let preco = fr ? normalizePriceText(ct ? `${fr},${ct}` : fr) : -1;
    if (preco < 0) {
      const metaP = $el.find('meta[itemprop="price"]').attr("content");
      if (metaP) preco = normalizePriceText(metaP);
    }

    let vendedor = "N/A";
    const ve = $el.find(
      "span.ui-search-item__brand-discoverability, span.poly-component__seller, p.poly-phrase--seller, [class*='seller']"
    ).first();
    if (ve.length) {
      const t = ve.text().replace(/\s+/g, " ").trim();
      vendedor = /por/i.test(t) ? t.split(/por/i).pop().trim() : t;
    } else {
      const p2 = $el.find("p.ui-search-item__group__element").first().text().trim();
      if (p2) vendedor = p2;
    }
    vendedor = vendedor.replace(/vendido por/gi, "").replace(/^por\s+/i, "").trim() || "N/A";

    const id_produto = extractMlbFromUrl(href);
    const grupo = id_produto !== "N/A" ? id_produto : extractMlbFromUrl(pageUrl);
    if (nome && nome !== "N/A" && preco > 0) {
      push({
        nome,
        preco,
        vendedor,
        id_produto,
        url: href,
        url_original: urlOriginal || pageUrl,
        grupo: grupo || "sem-grupo",
        status: "OK",
      });
    }
  });

  return out;
}

function extractJsonAfterMarker(html, marker) {
  const i = html.indexOf(marker);
  if (i < 0) return null;
  const start = html.indexOf("{", i);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let j = start; j < html.length; j++) {
    const ch = html[j];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = html.slice(start, j + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function readPriceFromStateNode(node) {
  if (node == null) return -1;
  if (typeof node === "number" && node > 0) return node;
  if (typeof node === "string") return normalizePriceText(node);
  if (typeof node !== "object") return -1;
  const n =
    node.amount ??
    node.value ??
    node.fraction ??
    (typeof node.price === "number" ? node.price : null);
  if (typeof n === "number" && n > 0) return n;
  if (typeof n === "string") return normalizePriceText(n);
  return -1;
}

function tryCatalogOfferFromStateObject(obj) {
  if (!obj || typeof obj !== "object") return null;
  let vendedor =
    obj.seller_nickname ||
    obj.seller_name ||
    (obj.seller && typeof obj.seller === "object" && (obj.seller.nickname || obj.seller.name)) ||
    "";
  vendedor = String(vendedor || "")
    .replace(/vendido por/gi, "")
    .trim();
  let preco = readPriceFromStateNode(obj.price);
  if (preco <= 0) preco = readPriceFromStateNode(obj.unit_price);
  if (preco <= 0 || !vendedor) return null;
  let href =
    obj.permalink ||
    obj.item_permalink ||
    obj.url ||
    obj.share_url ||
    "";
  const rawId = obj.item_id;
  if (!href && rawId != null) {
    const idStr = String(rawId).replace(/^MLB-?/i, "");
    if (/^\d{8,14}$/.test(idStr)) href = `https://produto.mercadolivre.com.br/MLB-${idStr}`;
  }
  if (!href || !/MLB/i.test(href)) return null;
  const abs = absolutizeMlHref(href.split("#")[0]);
  return {
    nome: "N/A",
    preco,
    vendedor,
    id_produto: extractMlbFromUrl(abs),
    url: abs,
    status: "OK",
  };
}

function walkCollectStateOffers(obj, seen, acc, depth) {
  if (depth > 18 || !obj || typeof obj !== "object") return;
  if (seen.has(obj)) return;
  seen.add(obj);
  const row = tryCatalogOfferFromStateObject(obj);
  if (row) acc.push(row);
  if (Array.isArray(obj)) {
    for (const x of obj) walkCollectStateOffers(x, seen, acc, depth + 1);
    return;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") walkCollectStateOffers(v, seen, acc, depth + 1);
  }
}

/**
 * Ofertas embutidas em __PRELOADED_STATE__ / __NEXT_DATA__ (layout novo do ML).
 */
export function parseCatalogOffersFromEmbeddedState(html, catalogUrl, urlOriginal, grupo) {
  const g = grupo || extractCatalogGrupo(catalogUrl) || "catalog";
  const markers = ["__PRELOADED_STATE__", "__NEXT_DATA__"];
  const acc = [];
  const seen = new WeakSet();
  const dedup = new Set();
  for (const m of markers) {
    const data = extractJsonAfterMarker(html, m);
    if (!data) continue;
    walkCollectStateOffers(data, seen, acc, 0);
  }
  const out = [];
  for (const r of acc) {
    const k = `${r.vendedor}|${r.url}|${r.preco}`;
    if (dedup.has(k)) continue;
    dedup.add(k);
    out.push({
      ...r,
      url_original: urlOriginal || catalogUrl,
      grupo: g,
    });
  }
  return out;
}

/**
 * Tenta extrair múltiplas ofertas da página /s (tabela + cards + blocos com preço).
 */
export function parseCatalogOffers($, catalogUrl, urlOriginal, grupo) {
  const seen = new Set();
  const rows = [];
  const g = grupo || extractCatalogGrupo(catalogUrl) || "catalog";
  const nomeTitulo =
    $("h1.ui-pdp-title, h1[class*='ui-pdp'], [data-testid='product-title']").first().text().trim() || "N/A";

  const pushRow = (r) => {
    const k = `${r.vendedor}|${r.url}|${r.preco}`;
    if (seen.has(k)) return;
    seen.add(k);
    rows.push(r);
  };

  const itemLinkSelector =
    'a[href*="MLB"][href*="mercadolivre"], a[href*="/up/MLB"], a[href*="produto.mercadolivre"][href*="MLB"]';

  /**
   * Comparador /s (2025+): tabela é div + forms — cada oferta é
   * form.ui-pdp-buybox.ui-pdp-table__row; preço principal em .ui-pdp-price__main-container;
   * item_id em input hidden; vendedor em a.ui-pdp-seller__link (não é link /p/MLB…).
   */
  $(".ui-pdp-s-table form.ui-pdp-buybox.ui-pdp-table__row, form.ui-pdp-buybox.ui-pdp-s-table__row").each(
    (_, el) => {
      const $form = $(el);
      const itemIdRaw = ($form.find('input[name="item_id"]').attr("value") || "").trim();
      if (!itemIdRaw || !/^MLB/i.test(itemIdRaw)) return;
      const digits = itemIdRaw.replace(/^MLB-?/i, "");
      if (!/^\d{8,14}$/.test(digits)) return;
      const url = `https://produto.mercadolivre.com.br/MLB-${digits}`;

      const $main = $form.find(".ui-pdp-price__main-container").first();
      const fr = $main.find(".andes-money-amount__fraction").first().text().trim();
      const ct = $main.find(".andes-money-amount__cents").first().text().trim();
      const preco = fr ? normalizePriceText(ct ? `${fr},${ct}` : fr) : -1;

      let vendedor = $form.find("a.ui-pdp-seller__link").first().text().replace(/\s+/g, " ").trim();
      if (!vendedor) {
        vendedor = $form.find("button.ui-pdp-seller__link-trigger-button").first().text().trim();
      }
      vendedor = vendedor.replace(/vendido por/gi, "").trim() || "N/A";

      if (preco > 0 && vendedor !== "N/A") {
        pushRow({
          nome: nomeTitulo,
          preco,
          vendedor,
          id_produto: extractMlbFromUrl(url),
          url,
          url_original: urlOriginal || catalogUrl,
          grupo: g,
          status: "OK",
        });
      }
    }
  );

  $("table tr, .andes-table tbody tr, tr[role='row']").each((_, tr) => {
    const $tr = $(tr);
    if ($tr.find("th").length && !$tr.find("td").length) return;
    const link = $tr.find(itemLinkSelector).filter((_, a) => {
      const h = $(a).attr("href") || "";
      return /MLB-?\d{8,14}/i.test(h) && !/\/p\/MLB\d+$/i.test(h.split("?")[0].replace(/\/+$/, ""));
    }).first();
    let href = link.attr("href")?.split("#")[0];
    if (!href) {
      const any = $tr.find('a[href*="MLB"]').first();
      href = any.attr("href")?.split("#")[0];
    }
    if (!href || !/MLB/i.test(href)) return;
    href = absolutizeMlHref(href);
    const nome = link.length ? link.text().trim() : nomeTitulo;
    const fr = $tr.find("span.andes-money-amount__fraction, span[class*='money-amount__fraction']").first().text().trim();
    const ct = $tr.find("span.andes-money-amount__cents, span[class*='money-amount__cents']").first().text().trim();
    const preco = fr ? normalizePriceText(ct ? `${fr},${ct}` : fr) : -1;
    let vendedor = "N/A";
    const vb = $tr.find("button.ui-pdp-seller__link-trigger-button, [class*='seller__link']").first();
    if (vb.length) vendedor = vb.text().replace(/vendido por/gi, "").trim();
    else {
      vendedor =
        $tr
          .find('[class*="seller"]:not([class*="sold"]), [data-testid*="seller"]')
          .first()
          .text()
          .replace(/\s+/g, " ")
          .trim() || "N/A";
    }
    vendedor = vendedor.replace(/vendido por/gi, "").trim() || "N/A";
    if (preco > 0 && vendedor !== "N/A") {
      pushRow({
        nome: nome || nomeTitulo,
        preco,
        vendedor,
        id_produto: extractMlbFromUrl(href),
        url: href,
        url_original: urlOriginal || catalogUrl,
        grupo: g,
        status: "OK",
      });
    }
  });

  const blockSelectors = [
    ".ui-pdp-other-sellers-item",
    ".ui-pdp-other-sellers__list-item",
    "[class*='ui-pdp-offers']",
    "[class*='other-sellers__item']",
    "[class*='buybox-offer']",
    "[data-testid*='offer']",
    "[data-testid*='seller']",
  ];
  $(blockSelectors.join(", ")).each((_, el) => {
    const $b = $(el);
    const a = $b.find(itemLinkSelector).first();
    let href = a.attr("href")?.split("#")[0];
    if (!href) href = $b.find('a[href*="MLB"]').first().attr("href")?.split("#")[0];
    if (!href || !/MLB/i.test(href)) return;
    href = absolutizeMlHref(href);
    const nome = a.length ? a.text().trim() : nomeTitulo;
    const fr = $b.find("span.andes-money-amount__fraction").first().text().trim();
    const ct = $b.find("span.andes-money-amount__cents").first().text().trim();
    const preco = fr ? normalizePriceText(ct ? `${fr},${ct}` : fr) : -1;
    let vendedor = $b.find("button.ui-pdp-seller__link-trigger-button, [class*='seller__link']").first().text().trim() || "N/A";
    vendedor = vendedor.replace(/vendido por/gi, "").trim();
    if (preco > 0 && vendedor !== "N/A") {
      pushRow({
        nome: nome || nomeTitulo,
        preco,
        vendedor: vendedor || "N/A",
        id_produto: extractMlbFromUrl(href),
        url: href,
        url_original: urlOriginal || catalogUrl,
        grupo: g,
        status: "OK",
      });
    }
  });

  const $offerScope = $(
    "[class*='other-sellers'], [class*='ui-pdp-offers'], [id*='marketplace'], table.andes-table, .andes-table, [class*='comparator']"
  ).first();
  if ($offerScope.length) {
    $offerScope
      .find("span.andes-money-amount__fraction, span[class*='andes-money-amount__fraction']")
      .each((_, frEl) => {
        const $fr = $(frEl);
        const $box = $fr.closest("tr, li, article, [class*='row'], [class*='offer'], [class*='seller']").first();
        if (!$box.length) return;
        const a = $box.find(itemLinkSelector).first();
        let href = a.attr("href")?.split("#")[0];
        if (!href) href = $box.find('a[href*="MLB"]').first().attr("href")?.split("#")[0];
        if (!href || !/MLB/i.test(href)) return;
        href = absolutizeMlHref(href);
        const fr = $fr.text().trim();
        const ct = $box.find("span.andes-money-amount__cents").first().text().trim();
        const preco = fr ? normalizePriceText(ct ? `${fr},${ct}` : fr) : -1;
        let vendedor =
          $box.find("button.ui-pdp-seller__link-trigger-button, [class*='seller']").first().text().trim() || "N/A";
        vendedor = vendedor.replace(/vendido por/gi, "").replace(/\s+/g, " ").trim() || "N/A";
        if (preco > 0 && vendedor !== "N/A") {
          pushRow({
            nome: nomeTitulo,
            preco,
            vendedor,
            id_produto: extractMlbFromUrl(href),
            url: href,
            url_original: urlOriginal || catalogUrl,
            grupo: g,
            status: "OK",
          });
        }
      });
  }

  return rows;
}

function catalogOfferDedupKey(a, b) {
  return (
    String(a.vendedor || "") === String(b.vendedor || "") &&
    Math.abs(Number(a.preco) - Number(b.preco)) < 0.02 &&
    String(a.grupo || "") === String(b.grupo || "")
  );
}

/** Prioriza URL do anúncio (produto.mercadolivre) sobre a página de catálogo /p/MLB…. */
function offerUrlRank(u) {
  if (!u) return 0;
  if (u.includes("produto.mercadolivre.com.br")) return 2;
  if (/mercadolivre\.com\.br\/up\/MLB/i.test(u)) return 2;
  return 1;
}

async function scrapeCatalogFlow(catalogUrl, urlOriginal, ownerId) {
  const grupo = extractCatalogGrupo(catalogUrl) || extractMlbFromUrl(catalogUrl);
  const baseUrl = catalogStripS(catalogUrl);

  const cookieString = await loadCookieString(ownerId);
  if (!cookieString) {
    console.warn(
      "[mlPriceAnalyze] Sem cookies ML (banco ou ML_COOKIE_STRING). A página /s pode retornar 401 sem sessão."
    );
  }

  const agent = superagent.agent();
  let htmlBase = "";
  try {
    const req1 = agent.get(baseUrl).timeout({ response: 25000, deadline: 40000 });
    applyMlBrowserHeaders(req1, baseUrl, "https://www.mercadolivre.com.br/");
    if (cookieString) req1.set("Cookie", cookieString);
    htmlBase = (await req1).text;
  } catch (e) {
    console.warn(`[mlPriceAnalyze] catalog base fetch: ${e.message}`);
  }

  let htmlCat = "";
  try {
    const req2 = agent.get(catalogUrl).timeout({ response: 25000, deadline: 40000 });
    applyMlBrowserHeaders(req2, catalogUrl, baseUrl);
    if (cookieString) req2.set("Cookie", cookieString);
    htmlCat = (await req2).text;
  } catch (e) {
    console.warn(`[mlPriceAnalyze] catalog /s fetch: ${e.message}`);
  }

  const out = [];

  if (htmlBase) {
    const principal = parseSingleProductFromSoup(cheerio.load(htmlBase), baseUrl, urlOriginal);
    if (principal.preco > 0) {
      out.push({ ...principal, grupo: grupo || principal.grupo });
    }
  }

  if (htmlCat) {
    const $cat = cheerio.load(htmlCat);
    const extra = parseCatalogOffers($cat, catalogUrl, urlOriginal, grupo);
    const fromState = parseCatalogOffersFromEmbeddedState(htmlCat, catalogUrl, urlOriginal, grupo);
    for (const r of [...extra, ...fromState]) {
      const sameUrl = out.some((x) => x.url === r.url);
      if (sameUrl) continue;
      const idx = out.findIndex((x) => catalogOfferDedupKey(x, r));
      if (idx >= 0) {
        if (offerUrlRank(r.url) > offerUrlRank(out[idx].url)) out[idx] = r;
        continue;
      }
      out.push(r);
    }
  }

  return out;
}

/**
 * @param {Array<{ link: string }>} linkDocs - documentos Link (campo link = URL)
 * @param {string} ownerId
 * @param {{ onProgress?: (p: { current: number, total: number, url: string }) => void }} opts
 */
export async function scrapePriceAnalyzeFromLinks(linkDocs, ownerId, opts = {}) {
  const { onProgress } = opts;
  const results = [];
  const total = linkDocs.length;

  for (let i = 0; i < linkDocs.length; i++) {
    const doc = linkDocs[i];
    const url = doc.link;
    const urlOriginal = url;
    onProgress?.({ current: i + 1, total, url });

    await sleep(280 + Math.random() * 450);

    try {
      let kind = classifyMercadoLivreUrl(url);
      if (kind === "skip") continue;

      if (kind === "catalog") {
        const rows = await scrapeCatalogFlow(url, urlOriginal, ownerId);
        results.push(...rows);
        continue;
      }

      if (kind === "item") {
        const compareUrl = catalogProductUrlToCompareUrl(url);
        if (compareUrl) {
          const rows = await scrapeCatalogFlow(compareUrl, urlOriginal, ownerId);
          if (rows.length > 0) {
            results.push(...rows);
            continue;
          }
        }
      }

      const html = await fetchMlHtml(url, ownerId);
      const $ = cheerio.load(html);

      // Se a URL foi classificada como anúncio único mas o HTML é listagem (vários MLB), trata como listagem.
      const blockCount = countSearchResultBlocks($);
      if (kind === "item" && blockCount >= 2) {
        kind = "listing";
      }

      if (kind === "listing") {
        let items = parseListingPage($, url, urlOriginal);
        if (items.length < 2 && blockCount >= 2) {
          console.warn(`[mlPriceAnalyze] Listagem com ${blockCount} blocos mas poucos itens parseados: ${url.slice(0, 100)}`);
        }
        results.push(...items);
        continue;
      }

      const row = parseSingleProductFromSoup($, url, urlOriginal);
      if (row.preco > 0) results.push(row);
    } catch (err) {
      console.error(`[mlPriceAnalyze] ${url}:`, err.message);
    }
  }

  return results;
}
