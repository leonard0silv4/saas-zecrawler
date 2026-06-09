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

## Paginação

`buildPageUrl(baseUrl, pageNumber)` gera a URL de cada página. Regras:

- URLs cujo último segmento de path começa com `_` (ex.: `_CustId_474495032`) usam
  concatenação direta sem barra: `_CustId_474495032_Desde_49_NoIndex_True`
- Demais URLs usam barra: `/televisores/_Desde_49_NoIndex_True`
- `_NoIndex_True` é sempre adicionado nas páginas 2+ (formato canônico do ML para paginação)

Essa distinção é necessária porque `/_CustId_XXX/_Desde_N` aponta para uma página diferente
do ML (sem contexto de seller), causando falsos positivos e contagem errada de resultados.

## Extração de SKU

`extractSkuFromUrl` suporta dois formatos de URL do ML:

| Formato | Exemplo | SKU extraído |
|---|---|---|
| Item padrão | `.../p/MLB123456789` | `MLB123456789` |
| Listagem universal | `.../up/MLBU3496682231` | `MLBU3496682231` |

## Filtragem de Produtos (HTML scraping)

Três critérios aplicados em `extractProductsFromPage` para aceitar um item como produto:

1. **Skip de patrocinados**: itens com classes `*ads-promotions*`, `*pub-label*` ou `*ads-label*`
   são descartados — correspondem ao badge "Patrocinado" do ML (Poly e layout legado).
   Na página `_CustId_`, resultados orgânicos = apenas produtos do seller monitorado;
   apenas os patrocinados são de outros vendors.

2. **Seletor raiz**: apenas `.ui-search-layout__item` — elemento específico da grade de
   resultados ML. O seletor `.andes-card` foi removido por ser genérico demais.

3. **URL com identificador MLB**: `extractSkuFromUrl` deve retornar SKU não-vazio.
   URLs sem `MLB` ou `/up/MLB` no path são descartadas.
