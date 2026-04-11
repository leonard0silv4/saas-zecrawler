/**
 * Agrupa links cadastrados (mesmo SKU = mesmo grupo de catálogo) e calcula alertas
 * de preço, no mesmo espírito do parseXML do frontend legado.
 */
export const PRICE_DIFF_THRESHOLD = 10;
export const MY_STORE_TAG = "minha-loja";

function productFromLink(link) {
  const tags = (link.tags || []).map((t) => String(t).toLowerCase());
  const isMyStore = tags.includes(MY_STORE_TAG);
  const preco = Number(link.nowPrice) || 0;
  return {
    id: String(link._id),
    nome: link.name || "—",
    preco,
    vendedor: (link.seller || "—").trim() || "—",
    url: link.link || "",
    urlOriginal: link.link || "",
    isMyStore,
    grupo: link.sku ? String(link.sku) : String(link._id),
  };
}

export function buildProductGroupsFromLinks(links) {
  const groupMap = new Map();
  for (const link of links) {
    const p = productFromLink(link);
    if (!groupMap.has(p.grupo)) groupMap.set(p.grupo, []);
    groupMap.get(p.grupo).push(p);
  }

  const productGroups = [];
  groupMap.forEach((groupProducts, grupo) => {
    if (!groupProducts.length) return;
    const nome = groupProducts[0].nome;
    const competitorPrices = groupProducts.filter((p) => !p.isMyStore).map((p) => p.preco);
    const minPrice =
      competitorPrices.length > 0
        ? Math.min(...competitorPrices)
        : Math.min(...groupProducts.map((p) => p.preco));
    const maxPrice =
      competitorPrices.length > 0
        ? Math.max(...competitorPrices)
        : Math.max(...groupProducts.map((p) => p.preco));

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

  return productGroups;
}
