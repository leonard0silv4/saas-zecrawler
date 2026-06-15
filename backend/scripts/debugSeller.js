#!/usr/bin/env node
/**
 * Diagnóstico do SellerScraper.
 * Uso: node backend/scripts/debugSeller.js "<url-do-seller>"
 *
 * Imprime o que o scraper vê na primeira página sem precisar subir o servidor.
 */
import superagent from "superagent";
import * as cheerio from "cheerio";

const url = process.argv[2];
if (!url) {
  console.error("Uso: node backend/scripts/debugSeller.js <url>");
  process.exit(1);
}

function extractSkuFromUrl(u) {
  const upMatch = u.match(/\/up\/(MLB[A-Z0-9]+)/i);
  if (upMatch) return upMatch[1].toUpperCase();
  const stdMatch = u.match(/MLB-?(\d+)/i);
  return stdMatch ? `MLB${stdMatch[1]}` : "";
}

function cleanUrl(u) {
  try {
    const parsed = new URL(u);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return u.split("#")[0].split("?")[0];
  }
}

async function run() {
  console.log(`\nFetching: ${url}\n`);
  let response;
  try {
    response = await superagent
      .get(url)
      .set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36")
      .timeout({ response: 15000, deadline: 20000 });
  } catch (err) {
    console.error("Erro na requisição:", err.message);
    process.exit(1);
  }

  console.log(`Status HTTP: ${response.status}`);
  console.log(`Tamanho HTML: ${response.text.length} chars`);

  if (response.text.includes("suspicious-traffic-frontend") || response.text.includes("robot_icon")) {
    console.log("\n[DIAGNÓSTICO] ML retornou página de bloqueio (bot detection / suspicious traffic).");
    console.log("  → Configure cookies válidos do ML no sistema para essa URL funcionar.\n");
    return;
  }

  console.log(`Primeiros 300 chars:\n${response.text.slice(0, 300)}\n`);

  const $ = cheerio.load(response.text);

  const LINK_SEL = "a.poly-component__title, .poly-component__title a, .ui-search-item__group__element, .ui-search-result__wrapper a";

  // Seletores candidatos
  const candidates = {
    ".ui-search-layout__item": $(".ui-search-layout__item").length,
    "[class*='search-layout__item']": $("[class*='search-layout__item']").length,
    "[class*='poly-card']": $("[class*='poly-card']").length,
    "li[class*='search']": $("li[class*='search']").length,
  };

  console.log("=== Contagem de seletores candidatos ===");
  for (const [sel, count] of Object.entries(candidates)) {
    console.log(`  ${sel}: ${count}`);
  }

  // Escolhe o seletor de item que tiver resultados
  const itemSelector =
    candidates[".ui-search-layout__item"] > 0
      ? ".ui-search-layout__item"
      : candidates["[class*='poly-card']"] > 0
      ? "[class*='poly-card']"
      : null;

  if (!itemSelector) {
    console.log("\n[DIAGNÓSTICO] Nenhum seletor de item encontrou resultados. Verifique se a URL é válida.");
    return;
  }

  console.log(`\nUsando seletor: ${itemSelector}`);
  const items = $(itemSelector);

  console.log(`\n=== Detalhes dos primeiros 3 items ===`);
  items.slice(0, 3).each((i, el) => {
    const linkEl = $(el).find(LINK_SEL).first();
    const href = linkEl.attr("href");
    const cleaned = href ? cleanUrl(href) : "(sem href)";
    const sku = href ? extractSkuFromUrl(cleaned) : "(n/a)";
    const isSponsored =
      $(el).find('[class*="ads-promotions"], [class*="pub-label"], [class*="ads-label"]').length > 0;
    const title = $(el).find(".poly-component__title, .ui-search-item__title").first().text().trim().slice(0, 60);
    console.log(`  [${i}] href=${cleaned} | sku=${sku} | sponsored=${isSponsored} | title="${title}"`);
  });

  // Resumo
  let withHref = 0;
  let withSku = 0;
  let sponsored = 0;
  items.each((_, el) => {
    if ($(el).find('[class*="ads-promotions"], [class*="pub-label"], [class*="ads-label"]').length > 0) {
      sponsored++;
      return;
    }
    const href = $(el).find(LINK_SEL).first().attr("href");
    if (href && href !== "#") {
      withHref++;
      if (extractSkuFromUrl(cleanUrl(href))) withSku++;
    }
  });

  console.log(`\n=== Resumo ===`);
  console.log(`  Total items encontrados : ${items.length}`);
  console.log(`  Sponsored (filtrados)   : ${sponsored}`);
  console.log(`  Com href válido         : ${withHref}`);
  console.log(`  Com SKU extraído        : ${withSku}`);

  if (withHref === 0) {
    console.log("\n[DIAGNÓSTICO] Items encontrados mas nenhum href — seletor de link desatualizado.");
    console.log("Primeiros hrefs brutos encontrados nos items:");
    items.slice(0, 3).each((i, el) => {
      $(el).find("a").slice(0, 2).each((j, a) => {
        console.log(`  item[${i}] a[${j}]: class="${$(a).attr("class")}" href="${$(a).attr("href")?.slice(0, 80)}"`);
      });
    });
  } else if (withSku === 0) {
    console.log("\n[DIAGNÓSTICO] Hrefs encontrados mas nenhum SKU — formato de URL de produto mudou.");
  } else {
    console.log("\n[DIAGNÓSTICO] Tudo OK. Scraper deve funcionar com esse seletor.");
  }
}

run();
