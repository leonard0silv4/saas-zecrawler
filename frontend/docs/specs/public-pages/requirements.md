# Páginas Públicas — Requirements

## Escopo

Páginas fora da área autenticada, incluindo a landing page estática.

## App React (frontend/src)

- `PublicPricingPage` em `/price` deve carregar planos com `GET /plans`.
- `AboutPage` em `/about-us` e `FaqPage` em `/faq` devem renderizar sem sessão.
- Devem usar layout/header público e SEO quando aplicável.
- Cards de planos pagos devem exibir o período de trial (`plan.trialDays` retornado pela API).

## Landing Page Estática (`landing/index.html`)

- Arquivo HTML puro (sem bundler) servido separadamente do app React.
- Contém seção de planos com preços e features **hardcoded** (não consome a API).
- **Ao alterar preços ou `TRIAL_DAYS` no backend, é obrigatório atualizar `landing/index.html` manualmente.**
- Deve exibir informação do trial de 10 dias nos cards de planos pagos (Starter, Pro, Business):
  - Texto "X dias grátis para começar" abaixo do preço
  - Botão de ação: "Começar X dias grátis"
- Hero badge, subtítulo da seção de planos, CTA final e rodapé devem mencionar o período de trial dos planos pagos.
- FAQ deve incluir pergunta sobre o período de teste dos planos pagos.

## Regras de conteúdo (evitar erros futuros)

- **Análise de Preços**: o sistema coleta preços internamente e gera o XML; o usuário pode visualizar a tabela e baixar o arquivo — ele **não importa** XML de fontes externas. Nunca descrever como "importar XML".
- **Plano Gratuito**: permite **5 links** monitorados (não 10). Conferir em `backend/config/plans.js` antes de alterar.
- **Monitoramento de links**: exibe apenas histórico de **preço**. Não mencionar "posição" ou "estoque" neste contexto.
- **Analytics & Vendas ML** e **Insights por IA**: disponíveis a partir do plano Pro; devem constar nos feature cards da landing, na tabela comparativa e no FAQ de funcionalidades.
- **Insights por IA**: acionados com 1 clique no módulo Analytics; 1 uso por conta/dia; gera recomendações categorizadas (crescimento, promoção, alertas de estoque) com prioridade; cache até meia-noite.
