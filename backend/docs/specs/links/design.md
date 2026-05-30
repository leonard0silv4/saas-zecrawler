# Design — Módulo de Links

## Endpoints

```
GET    /links                    →  requireModule("links") → LinkController.index
GET    /links/tags               →  requireModule("links") → LinkController.getTags
GET    /links/sellers            →  requireModule("links") → LinkController.getSellers
GET    /links/stats              →  requireModule("links") → LinkController.getStats
GET    /links/refresh/:storeName →  requireModule("links") → LinkController.refresh  (SSE)
POST   /links                    →  requireModule("links") → checkLinkLimit → LinkController.store
POST   /links/batch              →  requireModule("links") → checkLinkLimit → LinkController.storeBatch
PUT    /links/:id                →  requireModule("links") → LinkController.update
DELETE /links/:id                →  requireModule("links") → LinkController.destroy
DELETE /links/all/:storeName     →  requireModule("links") → LinkController.destroyAll
POST   /links/clear-rates/:storeName → requireModule("links") → LinkController.clearRates
```

## Modelo de Dados — Link

| Campo | Tipo | Descrição |
|---|---|---|
| `sku` | String (indexed) | SKU do produto no ML |
| `link` | String (required) | URL do produto |
| `name` | String | Nome do produto |
| `status` | String | Disponibilidade (ex: `https://schema.org/InStock`) |
| `myPrice` | Number | Preço do próprio vendedor |
| `nowPrice` | Number | Preço atual no ML |
| `lastPrice` | Number | Preço anterior (antes da última mudança) |
| `image` | String | URL da imagem |
| `seller` | String | Nome do vendedor atual |
| `dateMl` | Date | Data de publicação no ML |
| `storeName` | String (indexed) | Agrupador de links (nome da loja/busca) |
| `ratingSeller` | String | Reputação do vendedor |
| `full` | Boolean | Produto com logística Full |
| `catalog` | Boolean | Produto em catálogo ML |
| `tags` | [String] | Tags do usuário |
| `history` | [{price, seller, updatedAt}] | Histórico de preços (max 20) |
| `ownerId` | ObjectId ref User (required, indexed) | Dono do link |

## Fluxo de Cadastro Individual

```
POST /links { link, myPrice?, tag? }
  → isMercadoLivreUrl(link) ? continua : 400
  → scrapeProductData(link, ownerId)
  → Link.findOne({ sku, ownerId, storeName })
    → existe: atualiza nowPrice/lastPrice/status
    → não existe: Link.create(...)
```

## Fluxo de Refresh (SSE)

```
GET /links/refresh/:storeName
  → res.setHeader("Content-Type", "text/event-stream")
  → Link.find({ ownerId, storeName })
  → para cada link:
      scrapeProductData(link.link, ownerId)
      se preço mudou: atualiza nowPrice, lastPrice, history
      res.write(`data: ${pct}%\n\n`)
      se dados mudaram: res.write(`data: ${JSON.stringify(updates)}\n\n`)
  → res.end()
```

## Agregação de Estatísticas

```javascript
Link.aggregate([
  { $match: { ownerId, storeName? } },
  { $group: {
    _id: null,
    totalCount: { $sum: 1 },
    losingCount: { $sum: { $cond: [nowPrice < myPrice && myPrice > 0, 1, 0] } },
    losingPrices: { $push: myPrice quando losing }
  }},
  { $project: { totalCount, losingCount, losingMedianPrice: { $avg: losingPrices } } }
])
```

## Índices MongoDB

```javascript
linkSchema.index({ ownerId: 1, storeName: 1 });
linkSchema.index({ ownerId: 1, sku: 1 });
// + índices simples em sku e storeName
```
