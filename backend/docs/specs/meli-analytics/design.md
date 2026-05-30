# Design — Módulo de Analytics ML

## Endpoints

```
POST /meli/analytics/sync         →  requireModule("meliAnalytics") → sync
GET  /meli/analytics/summary      →  requireModule("meliAnalytics") → summary
GET  /meli/analytics/sales-chart  →  requireModule("meliAnalytics") → salesChart
GET  /meli/analytics/top-products →  requireModule("meliAnalytics") → topProducts
GET  /meli/analytics/orders       →  requireModule("meliAnalytics") → orders
GET  /meli/analytics/inventory    →  requireModule("meliAnalytics") → inventory
```

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
| `0 1 * * *` | Sync completo de produtos ML para owners Business |

## Índices MongoDB

```javascript
meliOrderSchema.index({ ownerId: 1, order_id: 1 }, { unique: true });
meliOrderSchema.index({ ownerId: 1, user_id: 1, date_closed: -1 });
```
