# MeliAnalyticsPage — Tasks

- [x] Documentar endpoints de analytics.
- [x] Registrar sincronização manual.
- [x] Extrair 9 componentes inline para `src/components/meli-analytics/` (Sessão C, 2026-05-30).
- [x] MeliAnalyticsPage reduzida de 1.089 → ~150 linhas.
- [x] Virtualização movida para dentro dos tabs (sem prop drilling de virtualizers).
- [x] Adicionar visão unificada de todas as lojas com KPIs, gráfico, abas e sync sem `user_id`.
- [x] Adicionar filtro "Crítico" no InventoryTab (frontend) e suporte `filter=critico` no backend.
- [x] Padronizar ícones lucide-react em InventoryTab (Ruptura, Crítico) e TopProductsTab (Receita, Unidades).
- [x] Tela inicia com visão unificada (todas as lojas) pré-selecionada.
- [x] Adicionar botão "Análise IA" com limite de 1 uso por dia por conta/período.
- [x] Criar model MeliAiAnalysis para persistência e cache da análise no MongoDB.
- [x] Endpoint GET|POST /meli/analytics/ai-analysis com cache diário e integração OpenAI gpt-4o-mini.
- [x] Painel de recomendações IA no frontend com recuperação automática de cache ao carregar a tela.
- [x] Enriquecer payload com tendência vs período anterior, perguntas, saúde dos anúncios e alertas de concorrentes.
- [x] Melhorar system prompt para 5 insights estruturados por eixo (Financeiro, Produtos, Operacional, Atendimento, Competitivo).
- [ ] Adicionar testes de cache por aba.
- [ ] Padronizar exibição de erro 403.
