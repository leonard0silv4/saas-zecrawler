# MeliAnalyticsPage — Design

## Arquivos

- `src/pages/MeliAnalyticsPage.jsx` — state, data fetching, KPIs, gráfico, shell de tabs
- `src/components/meli-analytics/KpiCard.jsx` — card de KPI (ícone, label, valor, sub)
- `src/components/meli-analytics/RupturaAlert.jsx` — alerta de ruptura de estoque Full
- `src/components/meli-analytics/ChartTooltip.jsx` — tooltip customizado do ComposedChart
- `src/components/meli-analytics/AccountSelect.jsx` — dropdown de seleção de conta ML (state próprio)
- `src/components/meli-analytics/ProductDrawer.jsx` — drawer lateral animado com detalhes do produto
- `src/components/meli-analytics/InventoryTab.jsx` — tab de estoque com virtualização própria + filtros/ordenação
- `src/components/meli-analytics/TopProductsTab.jsx` — tab de top produtos com filtros
- `src/components/meli-analytics/OrdersTab.jsx` — tab de pedidos com virtualização própria
- `src/components/meli-analytics/formatBRL.js` — utilitário de formatação de moeda

## Implementação

Usa parâmetros de período e conta selecionada para consultar `/meli/analytics/*`. As abas são controladas por `display: block/none` para preservar scroll e evitar remount dos virtualizadores.

Cache de abas via `tabLoadedRef` (Set) — ao trocar conta ou período, o Set é resetado e todas as abas são re-fetchadas na próxima visita.

`ProductDrawer` usa RAF + `useState` para animação de entrada/saída sem lib de animação.

## Refactor 2026-05-30

`MeliAnalyticsPage` reduzida de 1.089 → ~150 linhas. Cada tab (`InventoryTab`, `TopProductsTab`, `OrdersTab`) gerencia seu próprio `useVirtualizer` e ref de scroll — sem prop drilling de virtualizers.
