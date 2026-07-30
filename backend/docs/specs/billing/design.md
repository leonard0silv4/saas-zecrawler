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

checkMeliAccountLimit (exportada de plan.js, chamada dentro de MeliController.authCallback):
  → planConfig.maxMeliAccounts === 0 ? 403 : next()
  → Conta.exists({ user_id, ownerId }) → é reconexão? → skip check
  → Conta.countDocuments({ ownerId, disabled: {$ne:true} }) >= planConfig.maxMeliAccounts ? 403 HTML : prossegue
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

## Script de Migração de Assinantes

`src/scripts/migrateExistingSubscriptions.js` — execução única pós-deploy:

```
DRY_RUN=true node src/scripts/migrateExistingSubscriptions.js  # validar
node src/scripts/migrateExistingSubscriptions.js               # aplicar
```

Requer `OLD_STRIPE_PRICE_STARTER/PRO/BUSINESS` no `.env` (os IDs antigos).
Usa `proration_behavior: 'create_prorations'` — ajuste proporcional na próxima fatura.

## Campanha de Email — Cupom Promocional

`src/scripts/sendPromoCampaign.js` — script pontual para divulgar um cupom de
desconto (ex: `DESCONTO50`, 50% na primeira mensalidade) aos usuários no plano
gratuito, via Resend:

```
node src/scripts/sendPromoCampaign.js --test=<email>   # envia só para o email de teste
node src/scripts/sendPromoCampaign.js                   # envia para todos com plan="free"
```

- Busca destinatários com `User.find({ role: "owner", plan: "free" })`
- Reutiliza `sendPromoEmail(to, name)` em `services/emailService.js` (mesmo
  transporte Resend do reset de senha), com template próprio (`buildPromoHtml`)
  contendo o passo a passo de onde inserir o código promocional na tela de
  Checkout do Stripe (que já aceita `allow_promotion_codes: true`)
- Envio sequencial com delay entre mensagens e log de sucesso/falha por usuário

## Variáveis de Ambiente Necessárias

| Variável | Descrição |
|---|---|
| `STRIPE_SECRET_KEY` | Chave secreta da API Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret para validar assinatura do webhook |
| `STRIPE_PRICE_STARTER` | Price ID novo do plano Starter (R$ 99,90) |
| `STRIPE_PRICE_PRO` | Price ID novo do plano Pro (R$ 139,90) |
| `STRIPE_PRICE_BUSINESS` | Price ID novo do plano Business (R$ 199,90) |
| `OLD_STRIPE_PRICE_STARTER` | Price ID antigo do Starter (migração) |
| `OLD_STRIPE_PRICE_PRO` | Price ID antigo do Pro (migração) |
| `OLD_STRIPE_PRICE_BUSINESS` | Price ID antigo do Business (migração) |
| `FRONTEND_URL` | URL base para redirect após checkout |
