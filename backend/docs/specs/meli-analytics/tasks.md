# Meli Analytics — Tasks

## Cobertura de Testes

- [ ] Adicionar testes unitários para agregações de resumo, gráfico, top produtos, pedidos e inventário.
- [ ] Adicionar teste para tratamento de erro 403 na sincronização.
- [ ] Adicionar teste para sincronização automática no cron com múltiplas contas.

## Implementado (2026-06-12)

- [x] Aumentar frequência do cron de produtos: `0 1 * * *` → `0 */6 * * *` (a cada 6h) para reduzir divergência de estoque.
- [x] Adicionar suporte a `from`/`to` como alternativa ao `period` nos endpoints `summary`, `sales-chart`, `top-products`, `orders` via `resolveDates()`.
- [x] Novo endpoint `GET /meli/analytics/last-sync` retorna `updatedAt` mais recente de MeliProduct (usado no aviso de "última atualização").
- [x] Separação visual: aba Estoque/Top Produtos/Pedidos movida para nova rota `/meli/catalog-ml` (`MeliCatalogPage`). `MeliAnalyticsPage` agora exibe apenas KPIs, gráfico e IA.
- [x] Novo componente `DateRangePicker` com `react-day-picker@10` — disponível em ambas as páginas no grupo de botões de período.

## Melhorias Identificadas

- [x] Documentar endpoints e fluxo de sincronização.
- [x] Documentar tratamento de erro 403.
- [x] Documentar visão unificada sem `user_id` e retorno `accounts` no sync.
- [x] Corrigir filtro de perguntas banidas na análise de IA (`questionFilter` sem `answer_status: BANNED`).
- [x] Adicionar insights de horários/dias de pico de vendas e perguntas à análise de IA (6º eixo).
- [x] Corrigir divergência de `dias_estoque` entre análise de IA e drawer: IA agora usa `daysRestStock` persistido no produto (mesma fórmula do sidesheet).
- [x] Adicionar campo de busca por nome/SKU na aba Estoque (client-side, debounce 300ms, virtualização mantida).
- [x] Separar filtros de Tipo (Full/Normal) e Alerta (Ruptura/Crítico) na aba Estoque — agora são independentes e combináveis.
- [x] Exibir nome da loja (`nickname`) na tabela de Estoque e no sidesheet de produto (necessário na visão "Todas").
- [ ] Padronizar payload de erro detalhado entre sync manual e cron.
- [ ] Medir custo das agregações em bases com alto volume de pedidos.
