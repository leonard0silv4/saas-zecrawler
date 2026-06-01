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

Usa parâmetros de período e conta selecionada para consultar `/meli/analytics/*`. Quando a visão unificada está ativa, omite `user_id` para usar as agregações backend de todas as lojas. As abas são controladas por `display: block/none` para preservar scroll e evitar remount dos virtualizadores.

Cache de abas via `tabLoadedRef` (Set) — ao trocar conta, período ou modo unificado, o Set é resetado e todas as abas são re-fetchadas na próxima visita. O seletor de loja fica desabilitado na visão unificada, mantendo a loja selecionada para quando o usuário voltar ao modo por loja.

`ProductDrawer` usa RAF + `useState` para animação de entrada/saída sem lib de animação.

## Refactor 2026-05-30

`MeliAnalyticsPage` reduzida de 1.089 → ~150 linhas. Cada tab (`InventoryTab`, `TopProductsTab`, `OrdersTab`) gerencia seu próprio `useVirtualizer` e ref de scroll — sem prop drilling de virtualizers.
