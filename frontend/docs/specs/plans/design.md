# PlansPage — Design

## Arquivos

- `src/pages/PlansPage.jsx`
- `src/pages/PublicPricingPage.jsx`
- `src/components/SettingsPlanSection.jsx`

## Implementação

`PlansPage` é a tela autenticada. `PublicPricingPage` reutiliza dados públicos. Portal e checkout retornam URL do backend e redirecionam o browser.

`GET /plans` retorna `{ plans, modules }`. `PublicPricingPage` monta sua tabela comparativa (`buildFeatureRows`) iterando `modules` em vez de manter uma matriz de features hardcoded — cada linha vem de `MODULES[key].name`/`.plans`, com overrides pontuais (`meli`, `meliMessages`) que trocam o check/x por texto numérico (`plan.maxMeliAccounts`, `plan.maxMonthlyMessages`). `PlansPage` e `SettingsPlanSection` exibem `maxMeliAccounts`/`maxMonthlyMessages` nos blocos de limite, seguindo o mesmo padrão condicional já usado para `maxLinks`/`maxSellerMonitors`.

## Visual dos Cards (Sessão D — 2026-05-30)

Cada card de plano tem:
- **Barra de cor no topo** (`h-1` com `PLAN_TOP[]`) — diferencia planos visualmente
- **Borda lateral** (`PLAN_ACCENT[]`) — gray / blue / violet / amber por plano
- **Plano atual:** `border-brand-500 shadow-xl shadow-brand-100/60` + barra `bg-brand-500` + label "✓ Plano atual" em bg-brand-50
- **Badge "Mais popular":** `bg-brand-600 text-white ring-2 ring-brand-300 ring-offset-1`
- **Botão assinar:** `bg-brand-600 shadow-sm hover:shadow-md` com ícone `Zap`

## Alertas

- Banner "não-owner": `Alert variant="info"` (era `div.bg-blue-50`)
- Banner "cancelamento pendente": `Alert variant="warning"` (era `div.bg-amber-50`)
