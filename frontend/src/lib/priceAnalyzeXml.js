/**
 * Parser do XML produtos_mercadolivre.xml — equivalente ao xml-parser.ts do sistema antigo.
 * Lista padrão: VITE_PRICE_ANALYZE_MY_SELLERS ou constantes legadas; em parseXML, passe nomes
 * salvos em Configurações (conta) para sobrescrever.
 */
const ENV_STORES = import.meta.env.VITE_PRICE_ANALYZE_MY_SELLERS;

export function getDefaultMyStoresUppercase() {
  if (ENV_STORES) {
    return ENV_STORES.split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }
  return [
    "NETVASOSJARDINAGEM",
    "JARDINOGARDEN",
    "LYRIAFLORES",
    "SOMBRITELA_LONDRINA",
    "SOMBRITELA",
    "SOMBRETELA",
    "-1",
  ];
}

/** @deprecated use getDefaultMyStoresUppercase — mantido para imports antigos */
export const MY_STORES = getDefaultMyStoresUppercase();

export const PRICE_DIFF_THRESHOLD = 10;

/**
 * @param {string} xmlContent
 * @param {string[]|undefined} myStoresUppercase — se definido e não vazio, substitui env/lista padrão
 */
export function parseXML(xmlContent, myStoresUppercase) {
  const storeSet =
    Array.isArray(myStoresUppercase) && myStoresUppercase.length > 0
      ? myStoresUppercase
      : getDefaultMyStoresUppercase();

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

  if (xmlDoc.getElementsByTagName("parsererror").length) {
    throw new Error("Erro ao fazer parse do XML");
  }

  const produtosElement = xmlDoc.getElementsByTagName("produtos")[0];
  const extractionDate = produtosElement?.getAttribute("data_extracao") || null;

  const products = [];
  const produtosElements = xmlDoc.getElementsByTagName("produto");

  for (let i = 0; i < produtosElements.length; i++) {
    const el = produtosElements[i];
    const nome = el.getElementsByTagName("nome")[0]?.textContent || "";
    const preco = Number.parseFloat(el.getElementsByTagName("preco")[0]?.textContent || "0");
    const vendedor = el.getElementsByTagName("vendedor")[0]?.textContent || "";
    const id_produto = el.getElementsByTagName("id_produto")[0]?.textContent || "";
    const url = el.getElementsByTagName("url")[0]?.textContent || "";
    const urlOriginal = el.getElementsByTagName("url_original")[0]?.textContent || "";
    const grupo = el.getAttribute("grupo") || "";

    products.push({
      id: id_produto,
      nome,
      preco,
      vendedor,
      url,
      urlOriginal,
      isMyStore: storeSet.includes(vendedor.toUpperCase()),
      grupo,
    });
  }

  const groupMap = new Map();
  products.forEach((product) => {
    if (!groupMap.has(product.grupo)) groupMap.set(product.grupo, []);
    groupMap.get(product.grupo).push(product);
  });

  const productGroups = [];
  groupMap.forEach((groupProducts, grupo) => {
    if (groupProducts.length === 0) return;

    const nome = groupProducts[0].nome;
    const competitorPrices = groupProducts.filter((p) => !p.isMyStore).map((p) => p.preco);

    const minPrice =
      competitorPrices.length > 0 ? Math.min(...competitorPrices) : Math.min(...groupProducts.map((p) => p.preco));

    const maxPrice =
      competitorPrices.length > 0 ? Math.max(...competitorPrices) : Math.max(...groupProducts.map((p) => p.preco));

    let recommendation;
    const myPrices = groupProducts.filter((p) => p.isMyStore).map((p) => p.preco);

    if (myPrices.length > 0 && competitorPrices.length > 0) {
      const avgMyPrice = myPrices.reduce((a, b) => a + b, 0) / myPrices.length;
      const bestCompetitorPriceOnly = Math.min(...competitorPrices);
      const minMyPrice = Math.min(...myPrices);

      if (bestCompetitorPriceOnly < minMyPrice) {
        const priceDiff = ((avgMyPrice - bestCompetitorPriceOnly) / bestCompetitorPriceOnly) * 100;
        recommendation = `Preço ${priceDiff.toFixed(1)}% acima do melhor concorrente (R$ ${bestCompetitorPriceOnly.toFixed(2)}). Considere reduzir.`;
      } else if (bestCompetitorPriceOnly < avgMyPrice) {
        const priceDiff = ((avgMyPrice - bestCompetitorPriceOnly) / bestCompetitorPriceOnly) * 100;
        if (priceDiff > PRICE_DIFF_THRESHOLD) {
          recommendation = `Preço ${priceDiff.toFixed(1)}% acima do melhor concorrente. Considere reduzir.`;
        }
      } else {
        const avgCompetitorPrice = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
        const priceDiff = ((avgMyPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100;

        if (Math.abs(priceDiff) > PRICE_DIFF_THRESHOLD && priceDiff < 0) {
          recommendation = `Preço ${Math.abs(priceDiff).toFixed(1)}% abaixo da média. Você está competitivo!`;
        }
      }
    }

    productGroups.push({
      grupo,
      nome,
      products: groupProducts,
      competitorPrices,
      minPrice,
      maxPrice,
      recommendation,
    });
  });

  return {
    productGroups,
    extractionDate,
  };
}
