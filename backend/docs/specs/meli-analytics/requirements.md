# Requisitos — Módulo de Analytics ML (Business)

## Visão Geral

Sincroniza pedidos do Mercado Livre, calcula métricas financeiras (faturamento, taxa ML, líquido) e fornece análises de vendas, top produtos e inventário. Exclusivo do plano Business.

---

## Requisitos Funcionais

### RF-01 Sincronização de Pedidos
- `POST /meli/analytics/sync` sincroniza pedidos de todas as contas ML ativas do owner (ou de uma conta específica via `user_id`) e retorna `{ synced, forceFrom, accounts }`.
- Busca pedidos a partir da data do último pedido salvo menos 1 dia (ou 90 dias se não houver pedidos).
- `force=true` força re-sync completo dos últimos 90 dias.
- Busca taxa ML real via `GET /collections/:payment_id` (único endpoint que retorna `net_received_amount`).
- Taxa ML = `total_amount - net_received_amount`.
- Usa `bulkWrite` com upsert por `(ownerId, order_id)`.
- Após sync de pedidos, sincroniza também os produtos (`syncProductsForConta`).

### RF-02 Resumo Financeiro
- `GET /meli/analytics/summary?period=30d&user_id=<uid>` retorna as métricas abaixo; sem `user_id`, agrega todas as lojas:
  - `faturamento` — soma de `total_amount` dos pedidos pagos
  - `taxa_ml` — soma de `ml_fee`
  - `liq_marketplace` — faturamento - taxa_ml
  - `pedidos` — contagem de pedidos pagos
  - `ticket_medio` — faturamento / pedidos

### RF-03 Gráfico de Vendas
- `GET /meli/analytics/sales-chart?period=30d` retorna array diário com `{ date, receita, pedidos }`; sem `user_id`, agrega todas as lojas.
- Preenche dias sem vendas com zeros (série contínua).

### RF-04 Top Produtos
- `GET /meli/analytics/top-products?period=30d&sortBy=receita|unidades&onlyActive=true` retorna os N produtos mais vendidos; sem `user_id`, considera todas as lojas.
- Faz lookup em `MeliProduct` para enriquecer com `thumbnail`, `permalink` e `productStatus`.
- `onlyActive=true` filtra apenas produtos com status `active` no cache.

### RF-05 Listagem de Pedidos
- `GET /meli/analytics/orders?period=30d&page=1&limit=50` retorna pedidos paginados; sem `user_id`, lista todas as lojas.

### RF-06 Inventário
- `GET /meli/analytics/inventory?filter=full|normal|ruptura&sortBy=sold|velocity|stock|price` retorna produtos do cache; sem `user_id`, lista todas as lojas.
- `filter=ruptura` retorna apenas produtos com `alertRuptura = "RUPTURA"`.

### RF-07 Sincronização Automática (Cron)
- A cada 15 minutos, sincroniza pedidos de todos os owners Business com subscription ativa.
- Ignora contas com `authError` definido.
- Diariamente à 1h, sincroniza todos os produtos ML de owners Business.

### RF-08 Tratamento de Erro 403
- Se a API ML retorna 403, força refresh do token e tenta novamente.
- Se persistir, marca `conta.authError = "forbidden"` e retorna 0 (não lança exceção).

---

## Requisitos Não-Funcionais

- Módulo exclusivo do plano Business (`requireModule("meliAnalytics")`).
- Busca de taxas em batches de 5 requisições paralelas (`Promise.allSettled`).
- Paginação da API ML limitada a 500 pedidos por sync (offset < 500).

---

## Modelo de Dados — MeliOrder

| Campo | Tipo | Descrição |
|---|---|---|
| `order_id` | Number (unique por owner) | ID do pedido no ML |
| `ownerId` | ObjectId ref User | Dono |
| `user_id` | Number | ID da conta ML |
| `status` | String | Status do pedido (paid, cancelled…) |
| `total_amount` | Number | Valor total do pedido |
| `paid_amount` | Number | Valor pago |
| `ml_fee` | Number | Taxa retida pelo ML |
| `shipping_cost` | Number | Custo de frete |
| `date_closed` | Date | Data de fechamento |
| `order_items` | [{item_id, title, sku, quantity, unit_price, logistic_type}] | Itens do pedido |

---

## Propriedades de Correção

- **P1**: `ml_fee` deve ser sempre `>= 0` (nunca negativo).
- **P2**: `liq_marketplace = faturamento - taxa_ml` deve ser calculado corretamente.
- **P3**: `salesChart` deve retornar exatamente `N` entradas para um período de `N` dias, sem lacunas.
- **P4**: Após sync com `force=true`, pedidos dos últimos 90 dias devem estar no banco.
- **P5**: Conta com `authError = "forbidden"` não deve ser processada no cron automático.
