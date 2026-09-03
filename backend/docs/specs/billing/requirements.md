# Requisitos — Módulo de Billing (Planos & Stripe)

## Visão Geral

Gerencia planos de assinatura (Free, Starter, Pro, Business), integração com Stripe para pagamentos recorrentes e controle de acesso a módulos baseado no plano ativo.

---

## Planos Disponíveis

| Plano    | Preço      | Links | Sellers | Usuários Time | Times | Contas ML | Msgs ML/mês | Módulos Adicionais          |
|----------|-----------|-------|---------|---------------|-------|-----------|-------------|-----------------------------|
| Free     | R$ 0      | 5     | 1       | 1             | 1     | 0         | 0           | links, priceAnalyze, sellerMonitor, catalog |
| Starter  | R$ 19,90  | 30    | 5       | 2             | 1     | 1         | 100         | + meli, meliAnalytics, meliCatalog, meliMessages |
| Pro      | R$ 29,90 | 50    | 10      | 6             | 3     | 3         | 200         | (mesmos módulos do Starter) |
| Business | R$ 49,90 | 200   | 20      | 20            | 10    | 10        | ilimitado   | (mesmos módulos do Starter) |

Todo módulo é liberado a partir de qualquer plano pago (Starter+); `catalog` (Dimensões e Peso) é liberado inclusive no Free. A diferenciação entre planos pagos passa a ser por limite numérico (`maxMeliAccounts`, `maxMonthlyMessages`), não por bloqueio de módulo.

---

## Requisitos Funcionais

### RF-01 Checkout Stripe
- O sistema cria uma Checkout Session para o plano solicitado.
- Se o usuário já tem subscription ativa (`active` ou `trialing`), faz upgrade/downgrade direto via `subscriptions.update` sem redirecionar para checkout.
- Inclui trial de 10 dias para novas subscriptions.
- Retorna `{ url }` para redirect ou `{ updated: true, plan }` em caso de troca direta.

### RF-02 Portal do Cliente
- Cria uma Billing Portal Session do Stripe para o usuário gerenciar pagamento, faturas e cancelamento.
- Requer que o usuário tenha `stripeCustomerId`.

### RF-03 Status da Assinatura
- Retorna `plan`, `planConfig`, `isPlanActive` e dados live da subscription Stripe (status, `currentPeriodEnd`, `cancelAtPeriodEnd`).

### RF-04 Downgrade para Free
- Cancela a subscription ao fim do período atual (`cancel_at_period_end: true`).
- Não cancela imediatamente — o usuário mantém acesso até o fim do período pago.

### RF-05 Webhook Stripe
- Montado antes do `express.json()` para receber o body raw.
- Valida assinatura com `STRIPE_WEBHOOK_SECRET`.
- Processa eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- Em caso de cancelamento/não-pagamento, faz downgrade para `free` e zera `stripeSubscriptionId`.

### RF-06 Controle de Acesso por Módulo
- Middleware `requireModule(moduleName)` bloqueia acesso (HTTP 403) se o módulo não está em `allowedModules` do usuário.
- Middlewares de limite (`checkLinkLimit`, `checkSellerMonitorLimit`, `checkTeamUserLimit`, `checkTeamLimit`, `checkMeliAccountLimit`, `checkMeliMessageLimit`) bloqueiam criação/ação quando o limite do plano é atingido.
- `checkMeliAccountLimit` é verificado dentro de `MeliController.authCallback` (rota pública de OAuth). Reconexões de contas já existentes contornam a checagem de limite.
- `checkMeliMessageLimit` é verificado apenas em `POST /meli/messages/questions/:questionId/reply`: conta (via `MeliQuestion.countDocuments`) as respostas do mês corrente (UTC) e compara com `planConfig.maxMonthlyMessages` (`null` = ilimitado).

### RF-07 Migração de Assinantes Existentes
- Script `src/scripts/migrateExistingSubscriptions.js` migra assinantes ativos para os novos price IDs.
- Usa `proration_behavior: 'create_prorations'` — nenhum cliente é cobrado imediatamente; o ajuste é proporcional na próxima fatura.
- Requer `OLD_STRIPE_PRICE_*` no `.env` (os price IDs antigos) e `STRIPE_PRICE_*` (os novos).
- Deve ser rodado após deploy com `DRY_RUN=true` primeiro para validação.

---

## Requisitos Não-Funcionais

- Webhook retorna HTTP 200 mesmo em caso de erro interno (evita retentativas desnecessárias do Stripe).
- `getOrCreateCustomer` é idempotente: reutiliza `stripeCustomerId` existente ou cria novo se o customer foi deletado no Stripe.
- Sincronização de subscription (`syncSubscription`) é a única fonte de verdade para atualizar `plan` e `stripeSubscriptionStatus`.

---

## Propriedades de Correção

- **P1**: Após `checkout.session.completed` com subscription ativa, `user.plan` deve corresponder ao `planSlug` mapeado pelo `priceId`.
- **P2**: Após `customer.subscription.deleted`, `user.plan` deve ser `"free"` e `stripeSubscriptionId` deve ser `null`.
- **P3**: `requireModule("catalog")` deve permitir acesso (200) para qualquer plano, incluindo `free`. `requireModule("meliMessages")`/`requireModule("meliAnalytics")`/`requireModule("meliCatalog")` devem retornar 403 apenas para o plano `free`.
- **P6**: `checkMeliMessageLimit` deve retornar 403 quando a contagem de respostas do mês corrente `>= planConfig.maxMonthlyMessages`, exceto quando `maxMonthlyMessages === null` (Business, sempre permite).
- **P4**: `checkLinkLimit` deve retornar 403 quando `Link.countDocuments({ ownerId }) >= planConfig.maxLinks`.
- **P5**: Um usuário com subscription `past_due` não deve ter `isPlanActive = true` (a menos que seja free).
