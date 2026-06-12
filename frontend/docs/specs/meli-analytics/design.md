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

Usa `@tanstack/react-query` para todos os GETs. O `tabLoadedRef` foi removido — o lazy loading por aba é controlado pela opção `enabled: activeTab === "..."` em cada `useQuery`. Trocar conta, período ou visão unificada altera automaticamente os query keys, forçando re-fetch conforme necessário.

Quando a visão unificada está ativa, `userId = null` e o parâmetro `user_id` é omitido nas queries. As abas são controladas por `display: block/none` para preservar scroll e evitar remount dos virtualizadores. O seletor de loja fica desabilitado na visão unificada, mantendo a loja selecionada para quando o usuário voltar ao modo por loja.

Após sync, todos os query keys `["analytics-*"]` são invalidados. O cache da análise IA usa `staleTime: 1h`. O botão de fechar o painel IA usa `aiDismissed` (estado local) e reseta ao trocar contexto.

`unifiedView` inicializa em `true` — a tela abre na visão de todas as lojas por padrão. A primeira conta continua sendo pré-selecionada internamente para que ao trocar para modo "Loja" o seletor já tenha um valor.

`InventoryTab` suporta 5 filtros via `INVENTORY_FILTERS`: Todos, Full, Normal, Ruptura (`AlertTriangle`) e Crítico (`AlertCircle`). Botões usam ícones lucide-react — o ícone fica branco quando o botão está ativo. O backend aceita `filter=critico` → `alertRuptura === "CRÍTICO"`.

`TopProductsTab` usa `DollarSign` (Receita) e `Package` (Unidades) do lucide-react nos botões de ordenação, sem emojis.

`ProductDrawer` usa RAF + `useState` para animação de entrada/saída sem lib de animação.

## Refactor 2026-05-30

`MeliAnalyticsPage` reduzida de 1.089 → ~150 linhas. Cada tab (`InventoryTab`, `TopProductsTab`, `OrdersTab`) gerencia seu próprio `useVirtualizer` e ref de scroll — sem prop drilling de virtualizers.

## Análise IA (2026-06-04)

**Model:** `MeliAiAnalysis` — `backend/src/models/MeliAiAnalysis.js`
- Campos: `ownerId`, `user_id` (null = unificada), `period`, `analysis`, `generatedAt`
- Index: `{ ownerId, user_id, period, generatedAt: -1 }`

**Endpoint:** `GET|POST /meli/analytics/ai-analysis?user_id=&period=`
- `GET` → retorna análise em cache do dia (`cached: true`) ou `{}` sem cache
- `POST` → verifica cache, se não existir chama OpenAI `gpt-4o-mini`, salva no Mongo, retorna `{ analysis, generatedAt, cached: false }`
- Limite: 1 chamada real à OpenAI por `(ownerId, user_id, period)` por dia (janela: `startOfDay`)
- Payload enviado à IA: métricas + tendência vs período anterior, top 5 produtos, saúde dos anúncios, perguntas (total/sem resposta/mais perguntados), alertas de concorrentes 7d — ~520 tokens input
- Perguntas e concorrentes são omitidos do payload se não houver dados (sem chave vazia)
- 5 insights estruturados por eixo: Financeiro, Produtos, Operacional, Atendimento, Competitivo
- `max_tokens: 900`, `temperature: 0.4`
- API key: `process.env.API_GPT_IA`

**Frontend:**
- Estado `aiAlreadyUsedToday` controla o botão "Análise IA" no header (desabilitado após uso)
- `loadAiCache()` dispara junto com `loadSummary()` para restaurar análise do dia ao carregar
- Painel exibido entre KPI cards e gráfico, com timestamp e botão de fechar (descarta apenas da UI, não do banco)
