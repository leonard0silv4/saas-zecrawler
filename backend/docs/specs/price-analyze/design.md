# Design — Módulo de Análise de Preços

## Endpoints

```
GET  /price-analyze          →  requireModule("priceAnalyze") → PriceAnalyzeController.index
GET  /price-analyze/xml      →  requireModule("priceAnalyze") → PriceAnalyzeController.xml
POST /price-analyze/generate →  requireModule("priceAnalyze") → PriceAnalyzeController.generate
```

## Fluxo de Geração de XML

```
POST /price-analyze/generate { storeName?, limit? }
  → req.setTimeout(0)  // sem timeout
  → Link.find({ ownerId, storeName? }).limit(limit)
  → scrapePriceAnalyzeFromLinks(links, ownerId, { onProgress })
      → para cada link: consulta API oficial ML (catálogo / anúncio / busca)
      → retorna rows: [{ sku, nome, preco, vendedor, ... }]
  → buildPriceAnalyzeXml(rows, now)
  → PriceAnalyzeSnapshot.findOneAndUpdate({ ownerId }, { xml, extractionDate, rowCount, sourceUrlCount }, { upsert: true })
  → res.json({ ok, extractionDate, urlsProcessadas, linhasProduto })
```

## Fluxo de Visão Rápida

```
GET /price-analyze { storeName? }
  → Link.find({ ownerId, storeName? })
  → buildProductGroupsFromLinks(links)
      → agrupa por SKU
      → marca anúncios com MY_STORE_TAG como próprios
  → res.json({ productGroups, extractionDate, hint })
```

## Utilitários

### `buildProductGroupsFromLinks(links)`
- Agrupa links pelo SKU.
- Para cada grupo, separa anúncios próprios (tag `MY_STORE_TAG`) dos concorrentes.
- Calcula diferença de preço entre o próprio e o menor concorrente.

### `buildPriceAnalyzeXml(rows, date)`
- Gera XML estruturado com todos os produtos e seus preços.
- Compatível com ferramentas de precificação externas.

### `scrapePriceAnalyzeFromLinks(links, ownerId, options)`
- Consulta a **API oficial do ML** com token de conta conectada do próprio owner (`getOwnerMeliToken`). Sem conta → erro `NO_ACCOUNT` → `POST /price-analyze/generate` responde 422.
- Chama `options.onProgress({ current, total, url })` a cada iteração.
- Retorna rows `{ nome, preco, vendedor, id_produto, url, url_original, grupo, status }` com `preco > 0`.

## Coleta via API oficial (set/2026)

O scraping de HTML foi removido: o ML passou a responder com captcha wall (com cookies) e bot challenge (sem cookies). `classifyMercadoLivreUrl` decide o fluxo:

| Tipo | URL | Endpoints | grupo |
|---|---|---|---|
| `catalog` | `/p/MLB…` (com ou sem `/s`) | `GET /products/{id}` + `GET /products/{id}/items` (todas as ofertas, paginado); fallback `buy_box_winner` | id do produto |
| `item` | `produto.mercadolivre.com.br/MLB-…`, `?item_id=` | `GET /items/{id}` | `catalog_product_id` ou id |
| `listing` | `lista.mercadolivre…`, `?q=`, `_CustId_`, `/perfil/` | `GET /sites/MLB/search` (até 200 resultados) | `catalog_product_id` ou id |

Nickname do vendedor via `GET /users/{id}` (cache em memória em `fetchSeller`). Helpers em `src/utils/meliProductApi.js`.
