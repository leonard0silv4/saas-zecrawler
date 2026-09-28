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

## Cookies e Fallback

Cookies (`loadCookiesWithFallback`) não são mais usados pelo módulo de Links — ver seção abaixo.

## Busca de produto via API oficial ML (`src/utils/meliProductApi.js`)

Desde set/2026 o ML bloqueia scraping server-side: com cookies redireciona para `/captcha/wall/logged`; sem cookies devolve um desafio JS anti-bot (`/security/bot_challenge`, sem preço). Por isso `scrapeProductData`/`extractLinks` (`src/utils/scraper.js`) usam a API oficial:

- **Token**: `getOwnerMeliToken(ownerId)` — contas ML conectadas do próprio owner (`Conta`, `renewToken`). Sem conta → `{ error: "NO_ACCOUNT" }` (não há fallback para contas de outros usuários).
- **URL**: `parseMeliUrl` — `/p/MLB…` = produto de catálogo; `MLB-123…`, `?item_id=` ou `wid=` = anúncio. Fragmento `#…` é ignorado. Sem MLB → `{ error: "UNSUPPORTED_URL" }`.
- **Catálogo**: `GET /products/{id}` (nome, fotos, `buy_box_winner` → preço/vendedor/fulfillment); sem buy box → menor preço de `GET /products/{id}/items`.
- **Anúncio**: `GET /items/{id}` (título, fotos, preço, status, `catalog_listing`, `start_time`).
- **Vendedor**: `GET /users/{seller_id}` → `nickname` e `seller_reputation.level_id` (`ratingSeller`).
- **Listagem (lote)**: `GET /sites/MLB/search?q=` com o termo extraído da URL `lista.mercadolivre.com.br/<termo>`.
- `POST /links` responde 422 com mensagem específica (`NO_ACCOUNT`, `UNSUPPORTED_URL`, `NOT_FOUND`) ou genérica; nunca cria link vazio.
- `refresh`, `storeBatch` e o cron obtêm o token uma vez e reutilizam em todos os links. `refresh` preenche `name`, `image`, `sku` e `dateMl` quando vazios.
