# MeliAnalyticsPage — Requirements

## Escopo

Analytics Mercado Livre Business em `/meli/analytics`.

## Requisitos

- Deve listar contas ML para seleção.
- Deve abrir com visão unificada (todas as lojas) pré-selecionada; loja individual é opt-in.
- Deve permitir alternar entre visão por loja e visão unificada de todas as lojas.
- Deve buscar resumo, gráfico, top produtos, pedidos e inventário respeitando a visão ativa.
- Deve permitir sincronização manual por loja ou de todas as lojas, avisando que a sincronização unificada pode demorar.
- Deve manter cache por abas quando possível.
- Deve exibir tratamento claro para erro 403 de permissões ML.
- Aba Estoque deve ter filtros: Todos | Full | Normal | Ruptura | Crítico — todos com ícones lucide-react (sem emojis).
- Filtro "Ruptura" exibe produtos com `alertRuptura === "RUPTURA"`; filtro "Crítico" exibe `alertRuptura === "CRÍTICO"`.
- Aba Top Produtos deve ter filtros de ordenação com ícones lucide-react (sem emojis).
- Deve exibir botão "Análise IA" no header para gerar insights com IA sobre os dados do período.
- O botão deve ser desabilitado após uso, exibindo "IA usada hoje" — limitado a 1 uso por conta/período por dia.
- Ao carregar a tela, deve recuperar automaticamente a análise em cache do dia (se existir) e exibir o painel de recomendações.
- A análise deve ser descartável (botão X), e o cache persiste no backend até meia-noite.
