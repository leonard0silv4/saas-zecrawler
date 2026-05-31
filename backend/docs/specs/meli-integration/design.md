# Design — Módulo de Integração Mercado Livre

## Endpoints

```
GET  /meli/auth                        →  MeliController.authRedirect  (público)
GET  /meli/callback                    →  MeliController.authCallback  (público)
GET  /meli/accounts                    →  requireModule("meli") → getAccounts
DELETE /meli/accounts/:userId          →  requireModule("meli") → disconnectAccount
GET  /meli/products                    →  requireModule("meli") → getProducts
GET  /meli/products/autocomplete       →  requireModule("meli") → autocompleteProducts
GET  /meli/items/:itemId/permalink     →  requireModule("meli") → getItemPermalink
GET  /meli/shipment/:shipmentId        →  requireModule("meli") → getShipment
```

## Fluxo OAuth

```
GET /meli/auth?token=<jwt>
  → jwt.verify(token) → userId
  → redirect: https://auth.mercadolivre.com.br/authorization?
      response_type=code&client_id=ML_CLIENT_ID
      &redirect_uri=ML_REDIRECT_URI&state=userId
      &scope=offline_access read write orders:read

GET /meli/callback?code=<code>&state=<userId>
  → POST https://api.mercadolibre.com/oauth/token (authorization_code)
  → GET  https://api.mercadolibre.com/users/me
  → Conta.findOneAndUpdate({ user_id }, { access_token, refresh_token, nickname, expires_at, ownerId, authError: null }, { upsert: true })
  → HTML com redirect automático para /meli
```

## Fluxo de Autocomplete

```
GET /meli/products/autocomplete?q=<query>&user_id=<uid>
  1. Busca no cache MongoDB (até 25 candidatos)
  2. Revalida na API ML (GET /items/:id) → filtra ativos com estoque
  3. Se encontrou resultados → retorna { source: "cache", items }
  4. Se não encontrou e há query → busca na API ML (/users/:id/items/search?q=query)
  5. Upsert dos resultados no cache
  6. Retorna { source: "api", items }
```

## Limpeza de Produtos Órfãos

Ao final de cada `syncProductsForConta`, produtos no MongoDB que não constam no resultado
atual da API ML são apagados. Isso garante que anúncios encerrados, excluídos ou transferidos
não acumulem no banco indefinidamente.

```
MeliProduct.deleteMany({ ownerId, contaId, id: { $nin: allIds } })
```

É seguro porque `allIds` só existe após `fetchAllSellerItemIds` completar com sucesso —
qualquer falha na API lança erro e interrompe o fluxo antes da deleção.

## Sincronização de Produtos (`syncProductsForConta`)

```
syncProductsForConta(conta, ownerId):
  token = renewToken(conta)
  allIds = fetchAllSellerItemIds(token, conta.user_id)
    → paginação: limit=100, delay=250ms entre páginas

  para cada batch de 20 IDs:
    items = fetchItemsDetails(token, batch)  // Promise.allSettled
    upsertProductsFromItems(items, { ownerObjectId, conta })
      → MeliProduct.bulkWrite([updateOne upsert por (ownerId, id)])
    delay 300ms
```

## Cálculo de Métricas de Produto

```javascript
daysSinceStart = (now - start_time) / 86400000  // mínimo 1
averageSellDay = soldQty / daysSinceStart        // 0 se soldQty = 0
daysRestStock  = floor(availableQty / averageSellDay)  // null se averageSellDay = 0
alertRuptura   = computeRupturaAlert(availableQty, isFull, daysRestStock)
```

## Renovação de Token (`renewToken`)

```javascript
renewToken(conta, { force = false }):
  if (!force && now < conta.expires_at) return conta.access_token

  POST https://api.mercadolibre.com/oauth/token
    { grant_type: "refresh_token", client_id, client_secret, refresh_token }

  conta.access_token = data.access_token
  conta.refresh_token = data.refresh_token
  conta.expires_at = now + data.expires_in * 1000
  await conta.save()
  return data.access_token
```

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `ML_CLIENT_ID` | App ID do ML |
| `ML_CLIENT_SECRET` | App Secret do ML |
| `ML_REDIRECT_URI` | URI de callback registrada no ML |
