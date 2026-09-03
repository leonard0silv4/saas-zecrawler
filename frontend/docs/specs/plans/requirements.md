# PlansPage — Requirements

## Escopo

Planos, checkout e assinatura em `/plans`.

## Preços Atuais (set/2026)

| Plano    | Preço      | Links | Sellers | Usuários | Times | Contas ML | Msgs ML/mês |
|----------|-----------|-------|---------|----------|-------|-----------|-------------|
| Gratuito | R$ 0      | 5     | 1       | 1        | 1     | —         | —           |
| Starter  | R$ 99,90  | 30    | 5       | 2        | 1     | 1         | 100         |
| Pro      | R$ 139,90 | 50    | 10      | 6        | 3     | 3         | 200         |
| Business | R$ 199,90 | 200   | 20      | 20       | 10    | 10        | Ilimitado   |

Módulos `meliAnalytics`, `meliCatalog` e `meliMessages` disponíveis a partir do plano **Starter** (eram Pro+/exclusivo Business). Módulo `catalog` (Dimensões e Peso) disponível em **todos os planos**, incluindo o Gratuito.

## Requisitos

- Deve listar planos com `GET /plans`, que retorna `{ plans, modules }` — `plans` é o mesmo objeto de antes (indexado por slug), `modules` é o mapa `MODULES` do backend (nome + planos que liberam cada módulo).
- Deve consultar assinatura com `GET /stripe/status`.
- Deve iniciar checkout com `POST /stripe/checkout`.
- Deve abrir portal com `POST /stripe/portal`.
- Deve permitir downgrade com `POST /stripe/downgrade` quando aplicável.
- Deve reagir a callbacks do Stripe na URL.
- `PublicPricingPage` gera a tabela comparativa dinamicamente a partir de `modules` (não mais hardcoded), incluindo linhas com valores numéricos para "Contas Mercado Livre" e "Mensagens Mercado Livre" (usando `plan.maxMeliAccounts`/`plan.maxMonthlyMessages`).
- `AuthContext.canAccess`/`isBlockedByPlan` usam exclusivamente `user.allowedModules`/`user.planModules` retornados pelo backend, sem fallback local hardcoded — o backend sempre popula esses campos via `computeAccess()`.
