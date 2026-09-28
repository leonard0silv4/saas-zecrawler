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

## Coleta via API oficial (set/2026)

O scraping HTML (cookies + Cheerio + paginação `_Desde_`) foi removido: o ML passou a bloquear requisições server-side com captcha wall / bot challenge.

- **Token**: `getOwnerMeliToken(ownerId)` (`src/utils/meliProductApi.js`) — conta ML conectada do próprio owner (obrigatória).
- **URL do seller** → `parseListingUrl`: `_CustId_123` → `seller_id`; `/perfil/NICK` ou `/pagina/NICK` → `nickname`; `?q=` ou `lista.mercadolivre.com.br/<termo>` → `q` (combináveis). URL sem nada disso é rejeitada com 400 no cadastro/edição.
- **Busca**: `searchMeliItems` pagina `GET /sites/MLB/search` (50 por página; a busca pública limita offset a 1000 itens).
- **Casamento de produtos**: `SellerProduct` existente é encontrado por `url` **ou** `sku`; no update `url`/`sku` são migrados para o permalink/id da API, evitando alertas falsos de "novo produto" na primeira execução após a migração (itens antigos com SKU `MLBU…` de `/up/` ainda podem gerar um alerta único).
- Patrocinados não aparecem na busca por `seller_id`, então o filtro de ads do HTML não é mais necessário.
