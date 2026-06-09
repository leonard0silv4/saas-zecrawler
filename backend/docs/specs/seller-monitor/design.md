# Design — Módulo de Seller Monitor

## Endpoints

```
GET    /seller-monitor                          →  requireModule("sellerMonitor") → index
POST   /seller-monitor                          →  requireModule + checkSellerMonitorLimit → store
PUT    /seller-monitor/:id                      →  requireModule("sellerMonitor") → update
DELETE /seller-monitor/:id                      →  requireModule("sellerMonitor") → destroy
GET    /seller-monitor/:id/products             →  requireModule("sellerMonitor") → getProducts
POST   /seller-monitor/:id/run                  →  requireModule("sellerMonitor") → runScrape
POST   /seller-monitor/:id/reset-stuck          →  requireModule("sellerMonitor") → resetStuck
GET    /seller-monitor/:id/alerts               →  requireModule("sellerMonitor") → getAlerts
PUT    /seller-monitor/:id/alerts/read-all      →  requireModule("sellerMonitor") → markAllAlertsRead
PUT    /seller-monitor/alerts/:alertId/read     →  requireModule("sellerMonitor") → markAlertRead
```

## Fluxo de Scraping

```
runScraperForSeller(seller):
  → sellerScraper.js: faz HTTP request para seller.url
  → Cheerio: extrai lista de produtos (url, name, image, sku, price)
  → para cada produto:
      SellerProduct.findOne({ sellerId, url })
      → não existe: cria com isNew=true → SellerAlert.create({ type: "new_product" })
      → existe e preço mudou: atualiza priceHistory, priceChanged=true
                              → SellerAlert.create({ type: "price_change", oldPrice, newPrice })
  → SellerPage.findByIdAndUpdate({ scraping: false, lastRunAt: now })
  → emitSSE(ownerId, "seller:alerts", { sellerId, newAlerts })
```

## Fila de Scraping (scraperQueue)

```
enqueueSellerScrape(seller, runFn):
  → Bottleneck: limita concorrência e rate
  → isSellerPending(sellerId): verifica se já está na fila

resetStaleByTimeout(minutes):
  → SellerPage.updateMany({ scraping: true, scrapingStartedAt: { $lt: now - minutes*60s } },
                           { scraping: false, scrapingStartedAt: null })
```

## Cron Jobs Relacionados

| Schedule | Ação |
|---|---|
| `0 4 * * *` | `runAllActiveSellers()` — scraping diário de todos os sellers ativos |
| `*/15 * * * *` | `resetStaleByTimeout(45)` — libera scrapings travados |

## Índices MongoDB

```javascript
sellerPageSchema.index({ ownerId: 1, url: 1 }, { unique: true });
sellerProductSchema.index({ sellerId: 1, url: 1 }, { unique: true });
```

## Cookies e Fallback

`extractProductsFromPage` usa `loadCookiesWithFallback` (`src/utils/cookieLoader.js`). Se o owner não tiver cookies configurados, o sistema usa automaticamente cookies de outro usuário como fallback para manter o scraping funcional.

## Filtragem de Produtos

Dois critérios obrigatórios para um item scraped ser aceito como produto:

1. **Seletor raiz**: apenas `.ui-search-layout__item` — o elemento específico da grade de resultados do ML. O seletor `.andes-card` foi removido por ser genérico demais (usado em cards de info de vendedor, verificação de identidade, destaques, etc.) e causar capturas espúrias.

2. **URL com identificador MLB**: `extractSkuFromUrl` deve retornar um SKU não-vazio. URLs sem `MLB` no path são descartadas — isso filtra links de seções "relacionados", patrocinados de outros vendedores, e elementos que não são produtos reais do ML.
