# Design — Módulo de Billing

## Endpoints

```
POST /stripe/checkout   →  authenticate → StripeController.createCheckout
POST /stripe/portal     →  authenticate → StripeController.createPortal
GET  /stripe/status     →  authenticate → StripeController.status
POST /stripe/downgrade  →  authenticate → StripeController.downgrade
POST /stripe/webhook    →  express.raw() → stripeWebhookRoute  (sem authenticate)
GET  /plans             →  AuthController.getPlans  (público)
```

## Fluxo de Checkout

```
POST /stripe/checkout { planSlug }
  → PLANS[planSlug].stripePriceId existe?
  → getOrCreateCustomer(user)
  → user tem subscription ativa?
    → SIM: stripe.subscriptions.update (troca de plano imediata)
    → NÃO: stripe.checkout.sessions.create (redirect para Stripe)
```

## Fluxo de Webhook

```
POST /stripe/webhook (raw body)
  → stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  → switch(event.type):
    - checkout.session.completed → syncSubscription(subscription)
    - customer.subscription.created → syncSubscription
    - customer.subscription.updated → syncSubscription
    - customer.subscription.deleted → syncSubscription (→ plan = free)
    - invoice.payment_failed → syncSubscription
```

## Função `syncSubscription`

```
syncSubscription(subscription):
  → User.findOne({ stripeCustomerId: subscription.customer })
  → priceId = subscription.items.data[0].price.id
  → newPlan = planSlugByPriceId(priceId)
  → status = subscription.status

  se status in [active, trialing] e newPlan:
    user.plan = newPlan
    user.planExpiresAt = current_period_end

  se status in [canceled, unpaid, incomplete_expired]:
    user.plan = "free"
    user.planExpiresAt = null
    user.stripeSubscriptionId = null
    user.stripeSubscriptionStatus = null
```

## Controle de Acesso — Middleware Stack

```
requireModule(moduleName):
  → req.user.allowedModules.includes(moduleName) ? next() : 403

checkLinkLimit:
  → Link.countDocuments({ ownerId }) >= planConfig.maxLinks ? 403 : next()

checkSellerMonitorLimit:
  → SellerPage.countDocuments({ ownerId }) >= planConfig.maxSellerMonitors ? 403 : next()

checkTeamUserLimit:
  → User.countDocuments({ ownerId, role: {$in: [admin, member]} }) >= planConfig.maxTeamUsers ? 403 : next()

checkTeamLimit:
  → Team.countDocuments({ ownerId }) >= planConfig.maxTeams ? 403 : next()
```

## Mapeamento de Módulos por Plano

```
computeAccess(user, owner, extraPermissions):
  effectivePlan = owner.plan
  planModules = módulos onde MODULES[k].plans.includes(effectivePlan)

  se role owner ou admin:
    allowedModules = planModules
  se role member:
    perms = user.permissions ∪ extraPermissions (de times)
    se "links" in perms e "priceAnalyze" not in perms → adiciona "priceAnalyze"
    allowedModules = planModules ∩ perms
```

## Trial de Planos Pagos

- Todos os planos pagos (starter, pro, business) incluem **10 dias de trial** antes da primeira cobrança
- A constante `TRIAL_DAYS` em `backend/config/plans.js` controla esse valor em um único lugar
- `StripeController.createCheckout` usa `TRIAL_DAYS` via `subscription_data.trial_period_days`
- O campo `trialDays` é exposto em cada plano pago no endpoint `GET /plans`
- Durante o trial, o status da subscription é `"trialing"` (tratado como `"active"` para acesso)
- Para alterar o período de trial, basta mudar `TRIAL_DAYS` em `config/plans.js`

## Variáveis de Ambiente Necessárias

| Variável | Descrição |
|---|---|
| `STRIPE_SECRET_KEY` | Chave secreta da API Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret para validar assinatura do webhook |
| `STRIPE_PRICE_STARTER` | Price ID do plano Starter |
| `STRIPE_PRICE_PRO` | Price ID do plano Pro |
| `STRIPE_PRICE_BUSINESS` | Price ID do plano Business |
| `FRONTEND_URL` | URL base para redirect após checkout |
