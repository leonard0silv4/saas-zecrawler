# DashboardPage — Design

## Arquivos

- `src/pages/DashboardPage.jsx` — orquestração: state, effects, header, grid de módulos
- `src/components/dashboard/StatCard.jsx` — `StatCard` + `StatCardSkeleton`
- `src/components/dashboard/DashboardPrimitives.jsx` — `SectionHeader`, `SectionWrap`, `Panel`, `RankList`
- `src/components/dashboard/WinLossBar.jsx` — barra visual de vitória/derrota
- `src/components/dashboard/DarkTooltip.jsx` — tooltip escuro para gráficos Recharts
- `src/components/dashboard/LinksSection.jsx` — seção de links monitorados
- `src/components/dashboard/MensagensMlSection.jsx` — seção mensagens ML (inclui lock p/ não-business)
- `src/components/dashboard/PriceAnalyzeSection.jsx` — seção análise de preços (consome parseXML)
- `src/components/dashboard/SellerSection.jsx` — seção monitor de sellers

## Implementação

Combina dados do usuário em `AuthContext` com estatísticas agregadas do backend. O backend retorna blocos independentes para links, sellers e mensagens.

Polling de 60s via `setInterval` em `fetchStats`. `/api/price-analyze/xml` é consumido diretamente (fetch nativo) porque retorna XML raw — processado com `parseXML` do `lib/priceAnalyzeXml.js`.

## Estrutura de componentes (após refactor 2026-05-30)

`DashboardPage` passou de 711 linhas monolíticas para ~120 linhas de orquestração pura. Cada section (`LinksSection`, `MensagensMlSection`, `PriceAnalyzeSection`, `SellerSection`) é um arquivo independente que importa os primitivos compartilhados.

Hierarquia de dependências:
```
DashboardPage
├── LinksSection → StatCard, SectionHeader, SectionWrap, Panel, WinLossBar
├── MensagensMlSection → StatCard, SectionHeader, SectionWrap, Panel, RankList, DarkTooltip
├── PriceAnalyzeSection → StatCard, SectionHeader, SectionWrap, Panel, WinLossBar
└── SellerSection → StatCard, SectionHeader, SectionWrap, Panel, RankList, DarkTooltip
```
