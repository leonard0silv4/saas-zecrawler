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

## Dual-path: API pública vs. HTML scraping

`scrapeAllPages` detecta o tipo de URL e escolhe o caminho de coleta:

```
scrapeAllPages(baseUrl, ownerId)
  → _CustId_ na URL?  SIM → fetchSellerProductsViaApi(sellerId)
                      NÃO → HTML scraping com Cheerio (fallback)
```

### Caminho API (URLs com `_CustId_XXXXXXX`)

Usa a API pública de busca do ML sem autenticação:
```
GET https://api.mercadolibre.com/sites/MLB/search?seller_id={id}&limit=50&offset={n}
```
- Retorna **apenas** produtos do seller específico (sem patrocinados de outros sellers)
- Paginação via `paging.total` + `offset`
- Delay de 300ms entre páginas
- Não usa cookies

### Caminho HTML (outros formatos de URL)

Scraping com `superagent` + Cheerio. Critérios de validação:
1. **Seletor raiz**: apenas `.ui-search-layout__item`
2. **URL com identificador MLB**: URLs sem `MLB` no path são descartadas via `extractSkuFromUrl`
