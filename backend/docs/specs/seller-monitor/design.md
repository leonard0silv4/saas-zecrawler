# Design — Módulo de Seller Monitor

## Endpoints

```
GET    /seller-monitor                          →  requireModule("sellerMonitor") → index
GET    /seller-monitor/scan                     →  requireModule("sellerMonitor") → scanStatus
POST   /seller-monitor/scan                     →  requireModule("sellerMonitor") → runScan (202; 409 rodando; 429 < 15 min)
PUT    /seller-monitor/scan/categories          →  requireModule("sellerMonitor") → updateCategories ([{ id, name }], máx 5)
GET    /seller-monitor/categories[?parent=MLBx] →  requireModule("sellerMonitor") → categories (raiz em cache 24h)
GET    /seller-monitor/competitors              →  requireModule("sellerMonitor") → competitors
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
  → sellerScraper.js: parseListingUrl(seller.url) → params de busca (seller_id / nickname / q)
  → fetchSellerProducts: GET /sites/MLB/search paginado (50/pg, até 1000) com token de conta ML conectada
  → produtos { url: permalink, name: title, image: thumbnail, sku: item id, price }
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

## Coleta via varredura de catálogos (set/2026)

A API oficial do ML **não** permite listar anúncios de outro vendedor: `/users/{id}/items/search` ("Searching another user items is restricted") e `/sites/MLB/search` respondem 403 (validado em produção). Ela permite listar **todos os vendedores de um produto de catálogo** (`/products/{id}/items`). O monitor passou a funcionar sobre uma varredura de catálogos por owner (`src/services/catalogScanner.js`):

1. **Universo de catálogos** (máx. `MAX_CATALOGS_PER_SCAN` = 300, nesta prioridade):
   - `own`: `catalog_product_id` dos anúncios ativos das contas ML conectadas (`/users/{id}/items/search?search_type=scan` + multiget `/items?ids=`, até 1000 anúncios por conta);
   - `link`: produtos `/p/MLB…` cadastrados em Links;
   - `category`: `/highlights/MLB/category/{id}` (mais vendidos, só `type: PRODUCT`) das categorias escolhidas (máx. 5, `CatalogScanState.categories`).
2. Para cada catálogo: `/products/{id}` (nome, foto) + `fetchCatalogOffers` (até 100 ofertas) → `CatalogScan { productId, name, image, sources, offers[{ sellerId, nickname, itemId, price, full }] }`. Nicknames via multiget `/users?ids=` (20 por chamada). 429 → espera e nova tentativa; 250 ms entre chamadas (≈ 6 min para 300 catálogos).
3. **Seller monitorado** → `resolveSellerId`: `mlSellerId` salvo; `_CustId_` da URL; ou nickname de `/pagina/NICK` / `/perfil/NICK` encontrado nas ofertas varridas (case-insensitive). Não encontrado ou sem ofertas → `SellerPage.noData = true` ("Sem dados" na UI).
4. **Produtos do seller** = ofertas dele nos catálogos varridos → mesmo fluxo de `SellerProduct`/`SellerAlert` de antes (novo produto, mudança de preço > 1%).
5. **Concorrentes** (`listCompetitors`): agregação das ofertas por vendedor, excluindo as contas do próprio owner; `catalogCount` e `cheapest` (catálogos em que tem a menor oferta). `buy_box_winner` quase nunca vem em `/products`, por isso não é usado.

- **Cron diário** (`runAllActiveSellers`): uma varredura por owner, depois atualiza todos os sellers dele. `runScraperForSeller` (cadastro, botão atualizar) só varre de novo se a última varredura tiver mais de 20 h.
- **Cadastro**: por concorrente (`{ mlSellerId, nickname }` → URL `/perfil/NICK`) ou por URL que identifique o vendedor (id ou nickname). Termo de busca sozinho não é mais aceito.
- **Limitação**: só aparecem anúncios de catálogo dentro do universo varrido; anúncios fora de catálogo do concorrente não são visíveis pela API.
