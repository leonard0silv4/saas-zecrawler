# Design — Módulo de Analytics ML

## Endpoints

```
POST /meli/analytics/sync         →  requireModule("meliAnalytics") → sync (com `user_id` = loja; sem `user_id` = todas)
GET  /meli/analytics/summary      →  requireModule("meliAnalytics") → summary (agrega todas sem `user_id`)
GET  /meli/analytics/sales-chart  →  requireModule("meliAnalytics") → salesChart (agrega todas sem `user_id`)
GET  /meli/analytics/top-products →  requireModule("meliAnalytics") → topProducts
GET  /meli/analytics/orders       →  requireModule("meliAnalytics") → orders
GET  /meli/analytics/inventory    →  requireModule("meliAnalytics") → inventory
GET  /meli/analytics/last-sync    →  requireModule("meliAnalytics") → lastSync (updatedAt mais recente de MeliProduct)
```

## Filtros de Data (period vs. range customizado)

Os endpoints `summary`, `sales-chart`, `top-products` e `orders` aceitam dois modos de filtro de data:

| Modo | Params | Exemplo |
|---|---|---|
| Período fixo | `period=30d` | últimos 30 dias |
| Range personalizado | `from=2025-01-01&to=2025-01-31` | datas absolutas |

A função `resolveDates(query)` em `MeliAnalyticsController.js` determina qual modo usar. Se `from` e `to` estiverem presentes, o `period` é ignorado.

## Cron de Sync de Produtos

O sync automático de produtos/estoque roda a cada **6 horas** (`0 */6 * * *`). Esse intervalo equilibra atualização de dados vs. tráfego na API do ML. Dados de estoque são um snapshot — pequenas divergências com o painel ML são esperadas se houver vendas recentes entre sincronizações. O botão Sincronizar manual força atualização imediata.

`syncProductsForConta` busca cada item via `GET /items/{id}` com **1 retry com backoff** em caso de falha (exceto 404/400, que não repetem). Itens que falham após o retry ficam com o valor anterior no Mongo e são reportados em `failedCount`/`failedIds` — não silenciados. O retorno de `syncProductsForConta` é `{ total, failedCount, failedIds, totalItems, paginationLimitReached }`.

`POST /meli/analytics/sync` propaga essas falhas por conta em vez de reportar sucesso sempre: retorna `accountsFailed` (contas cuja sincronização de pedidos/produtos falhou por completo) e `productsFailedTotal` (soma de itens que falharam individualmente entre as contas ok). O front usa esses campos para diferenciar sync total, parcial e falho.

`fetchAllSellerItemIds` para de paginar ao atingir offset **1000** (limite documentado da API `items/search` por seller) e marca `paginationLimitReached: true` — catálogos maiores que isso têm itens não sincronizados naquela rodada, sem paginação alternativa implementada ainda.

## Filtros de Loja

Todos os endpoints de leitura aceitam `user_id` opcional. Quando presente, filtram uma loja; quando ausente, agregam todas as lojas do owner. O sync segue a mesma regra e retorna `accounts` com a quantidade de contas processadas.

## Filtros de Inventário

O endpoint `GET /meli/analytics/inventory` aceita três filtros independentes:

| Param | Valores | Comportamento |
|---|---|---|
| `filter` | `full`, `normal` | Filtra por tipo de logística (isFull) |
| `alert` | `ruptura`, `critico` | Filtra por nível de alerta de estoque |
| `status` | status do ML (ex: `active`, `paused`) ou `all` | Filtra por status do anúncio. **Default: `active`** — para bater com a visão padrão do painel do ML. |

Os parâmetros podem ser combinados (ex: `filter=full&alert=ruptura` = produtos Full em ruptura). Cada um é opcional e independente dos outros. O campo `nickname` (nome da loja no ML) já está no documento `MeliProduct` e é retornado junto com os demais campos pelo `.lean()`.

## Estoque Full — Fonte de Dados

`estoque_full` deixou de ser uma cópia de `available_quantity` (bug que causava divergência grande e sistemática com o painel Full do ML). Para itens com `logisticType === "fulfillment"`, `syncProductsForConta` busca o estoque real em cascata:

1. `GET /inventories/{item.inventory_id}/stock/fulfillment` (modelo clássico) → `{ total, available_quantity, not_available_quantity: {damaged, lost, withdrawal, not_supported, ...} }`.
2. Se indisponível, `GET /user-products/{item.user_product_id}/stock` (modelo "estoque distribuído") → `{ locations: [{ type: "meli_facility", quantity }] }`.
3. Se ambos falharem, cai de volta para `item.available_quantity` do endpoint clássico `/items/{id}`.

A fonte usada fica registrada em `estoqueFullSource` (`fulfillment_api` | `user_products_api` | `fallback_item`), e o breakdown fica em `estoque_full_detalhe` (`{total, available, not_available_by_reason, fetchedAt}`). O frontend mostra um indicador quando `estoqueFullSource === "fallback_item"`, avisando que o número é estimado.

Essa chamada extra roda sequencialmente (throttle de 150ms) só para itens Full, separada do throttle de 300ms entre batches do endpoint clássico — catálogos com muitos itens Full tornam o sync mais lento.

**Ainda não confirmado em produção**: qual dos dois modelos (`inventory_id` vs `user_product_id`) a conta do seller realmente usa, nem se `item.user_product_id` vem no payload padrão de `/items/{id}` — precisa validação contínua via `estoqueFullSource` nos logs.

## Fluxo de Sincronização de Pedidos

```
_doSync(conta, ownerId, { forceFrom }):
  fromDate = forceFrom ? now - 90d : lastOrder.date_created - 1d (ou now - 90d)
  
  loop (offset += 50, até 500):
    GET /orders/search?seller=user_id&sort=date_desc&limit=50&offset&date_created.from=fromDate
    feeMap = fetchOrderFees(results, headers, user_id)
      → para cada pedido: GET /collections/:payment_id (batch de 5 paralelos)
      → ml_fee = total_amount - net_received_amount
    ops.push(updateOne upsert por (ownerId, order_id))
  
  MeliOrder.bulkWrite(ops)
```

## Tratamento de Erro 403

```
syncOrdersForConta(conta, ownerId):
  try:
    return await _doSync(conta, ownerId)
  catch err:
    if err.status !== 403: throw
    
    // Força refresh e tenta novamente
    await renewToken(conta, { force: true })
    try:
      return await _doSync(conta, ownerId)
    catch retryErr:
      if retryErr.status === 403:
        conta.authError = "forbidden"
        return 0
      throw retryErr
```

## Pipeline de Top Produtos

```javascript
MeliOrder.aggregate([
  { $match: { ownerId, status: "paid", date_closed: { $gte: from, $lte: to } } },
  { $unwind: "$order_items" },
  { $group: {
    _id: "$order_items.item_id",
    title, sku, unidades: { $sum: quantity },
    receita: { $sum: quantity * unit_price }
  }},
  { $sort: { receita: -1 } },  // ou unidades: -1
  { $lookup: { from: "meliproducts", ... } },  // thumbnail, permalink, status
  { $match: { productStatus: "active" } },  // se onlyActive=true
  { $limit: N }
])
```

## Gráfico de Vendas (série contínua)

```javascript
// Agrupa por dia no banco
rows = MeliOrder.aggregate([...group by date_closed...])
byDate = Object.fromEntries(rows.map(r => [r._id, r]))

// Preenche todos os dias do período
days = eachDayOfInterval({ start: from, end: to })
data = days.map(d => ({
  date: format(d, "yyyy-MM-dd"),
  receita: byDate[key]?.receita || 0,
  pedidos: byDate[key]?.pedidos || 0
}))
```

## Cron Jobs

| Schedule | Ação |
|---|---|
| `*/15 * * * *` | Sync de pedidos para owners Business com subscription ativa |
| `0 */6 * * *` | Sync completo de produtos ML para owners Business |

## Análise de IA (`aiAnalysis`)

Endpoints:
```
GET  /meli/analytics/ai-analysis  →  retorna análise em cache do dia (se existir)
POST /meli/analytics/ai-analysis  →  gera nova análise via GPT-4o-mini
```

O cache é por `(ownerId, user_id, period)` com TTL de 1 dia (`generatedAt >= startOfDay`).

### Cálculo de Dias de Estoque Restante

O campo `dias_estoque` enviado à IA em `top5_produtos` usa o valor **`daysRestStock` já calculado e persistido no documento `MeliProduct`**, que é o mesmo exibido no drawer de produto na aba Estoque. A fórmula é:

```
daysRestStock = Math.floor(available_quantity / averageSellDay)
averageSellDay = sold_quantity / daysSinceListingStart
```

Isso garante consistência entre o que a IA reporta e o que o usuário vê no sidesheet. Anteriormente a IA recalculava `dias_estoque` com velocidade do período selecionado e `Math.round`, causando divergência.

### Payload enviado ao GPT

```json
{
  "periodo": "30d",
  "metricas": { "faturamento", "liquido_marketplace", "pedidos", "ticket_medio", "taxa_ml_pct", "vs_periodo_anterior" },
  "top5_produtos": [...],
  "estoque": { "em_ruptura", "nivel_critico", "nivel_baixo" },
  "anuncios": { "ativos", "pausados", "encerrados" },
  "perguntas": { "total", "sem_resposta", "taxa_resposta_pct", "mais_perguntados" },
  "concorrentes": { "lojas_monitoradas", "alertas_7d" },
  "horarios": {
    "vendas": { "dias_pico": ["Seg", "Ter", "Qua"], "horas_pico": ["14h", "15h", "10h"] },
    "perguntas": { "dias_pico": ["Sáb", "Dom"], "horas_pico": ["11h", "20h"] }
  }
}
```

### Filtros de perguntas

O `questionFilter` exclui mensagens banidas usando os mesmos critérios do `MeliMessagesController`:

```javascript
{
  "raw_payload.status": { $nin: ["UNDER_REVIEW", "CLOSED_BY_ML", "DISABLED", "DELETED", "BANNED"] },
  answer_status: { $ne: "BANNED" }
}
```

### Eixos de insight (system prompt)

A análise gera 6 insights — um por eixo:
1. Financeiro
2. Produtos
3. Operacional
4. Atendimento
5. Competitivo
6. Horários (dias e horas de pico de vendas e perguntas)

As agregações de horários usam timezone `"America/Sao_Paulo"` via `$dayOfWeek`/`$hour` do MongoDB para refletir horário de Brasília.

## Índices MongoDB

```javascript
meliOrderSchema.index({ ownerId: 1, order_id: 1 }, { unique: true });
meliOrderSchema.index({ ownerId: 1, user_id: 1, date_closed: -1 });
```
