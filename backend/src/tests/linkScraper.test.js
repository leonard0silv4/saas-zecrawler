import test from "node:test";
import assert from "node:assert/strict";
import { parseMeliUrl, parseListingUrl, searchQueryFromUrl } from "../utils/meliProductApi.js";
import { classifyMercadoLivreUrl } from "../services/mlPriceAnalyzeScraper.js";

test("parseMeliUrl identifica produto de catálogo e ignora fragmento de tracking", () => {
  const url = "https://www.mercadolivre.com.br/chuveiro-ducha-nd-blindada-zagonel-6500w-cor-branco-potencia-65-kw/p/MLB51857122"
    + "#polycard_client=recommendations_home_navigation-recommendations&wid=MLB4125123625";
  assert.deepEqual(parseMeliUrl(url), { type: "product", id: "MLB51857122" });
});

test("parseMeliUrl identifica anúncio (item) com hífen", () => {
  const url = "https://produto.mercadolivre.com.br/MLB-4125123625-chuveiro-zagonel-_JM";
  assert.deepEqual(parseMeliUrl(url), { type: "item", id: "MLB4125123625" });
});

test("parseMeliUrl usa item_id da query string", () => {
  const url = "https://www.mercadolivre.com.br/algo/up/MLBU123?item_id=MLB999888777";
  assert.deepEqual(parseMeliUrl(url), { type: "item", id: "MLB999888777" });
});

test("parseMeliUrl retorna null sem código MLB", () => {
  assert.equal(parseMeliUrl("https://www.mercadolivre.com.br/ofertas"), null);
});

test("parseListingUrl extrai seller_id, nickname e termo de busca", () => {
  assert.deepEqual(parseListingUrl("https://lista.mercadolivre.com.br/_CustId_123456"), { seller_id: "123456" });
  assert.deepEqual(
    parseListingUrl("https://lista.mercadolivre.com.br/chuveiro-zagonel_CustId_99_NoIndex_True"),
    { seller_id: "99", q: "chuveiro zagonel" }
  );
  assert.deepEqual(parseListingUrl("https://www.mercadolivre.com.br/perfil/LOJAX"), { nickname: "LOJAX" });
  assert.equal(parseListingUrl("https://www.mercadolivre.com.br/ofertas"), null);
});

test("classifyMercadoLivreUrl distingue catálogo, listagem e anúncio", () => {
  assert.equal(classifyMercadoLivreUrl("https://www.mercadolivre.com.br/x/p/MLB51857122/s"), "catalog");
  assert.equal(classifyMercadoLivreUrl("https://lista.mercadolivre.com.br/chuveiro"), "listing");
  assert.equal(classifyMercadoLivreUrl("https://produto.mercadolivre.com.br/MLB-4125123625-x-_JM"), "item");
  assert.equal(classifyMercadoLivreUrl("https://www.amazon.com.br/x"), "skip");
});

test("searchQueryFromUrl extrai termos do slug para buscar catálogo", () => {
  assert.equal(
    searchQueryFromUrl("https://www.mercadolivre.com.br/sombretela-80-sombreamento/up/MLBU3964029257?pdp_filters=item_id:MLB6781768694"),
    "sombretela 80 sombreamento"
  );
  assert.equal(searchQueryFromUrl("https://produto.mercadolivre.com.br/MLB-4125123625-chuveiro-zagonel-_JM"), "chuveiro zagonel");
  assert.equal(searchQueryFromUrl("não é url"), "");
});
