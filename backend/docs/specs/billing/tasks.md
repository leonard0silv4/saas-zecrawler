# Tasks — Módulo de Billing

## Cobertura de Testes

- [ ] 1. Teste unitário para `syncSubscription` — status `canceled` deve zerar subscription e downgrade para free
- [ ] 2. Teste unitário para `computeAccess` — member com permissão `links` deve receber `priceAnalyze` automaticamente
- [ ] 3. Teste para `requireModule` — plano free não acessa `meli`, `meliMessages`, `meliAnalytics`, `meliCatalog` (mas acessa `catalog`)
- [ ] 4. Teste para `checkLinkLimit` — retorna 403 quando count >= maxLinks
- [ ] 5. Teste para `checkMeliMessageLimit` — retorna 403 no Starter/Pro ao atingir 100/200 respostas no mês corrente, e nunca bloqueia no Business (`maxMonthlyMessages: null`)

## Implementado

- [x] Constante `TRIAL_DAYS` centralizada em `config/plans.js` — usada no StripeController e exposta via `/api/plans`
- [x] Frontend exibe "X dias grátis" nos cards de planos pagos (PlansPage e PublicPricingPage)
- [x] Botão de upgrade mostra "Começar X dias grátis" em vez de "Assinar agora"
- [x] SettingsPlanSection exibe status "Em período de teste" com data de encerramento
- [x] Metadata de UI de planos centralizada em `frontend/src/config/plansMeta.js`
- [x] Refatoração de planos e preços (jun/2026): novos preços R$99,90/139,90/199,90, novos limites, campo `maxMeliAccounts` adicionado
- [x] `meliAnalytics` aberto para plano Pro (era exclusivo Business)
- [x] `checkMeliAccountLimit` implementado em `middleware/plan.js`; checagem de reconexão em `MeliController.authCallback`
- [x] Reestruturação de planos (set/2026): `catalog`, `meliAnalytics`, `meliCatalog`, `meliMessages` liberados a partir do Starter (catalog inclusive no Free); novo `maxMonthlyMessages` (100/200/ilimitado) e `checkMeliMessageLimit`; `GET /plans` passa a expor `MODULES`; jobs de cron de Analytics ML (`services/cron.js`) atualizados para não filtrar mais só `plan: "business"`
- [x] Script `migrateExistingSubscriptions.js` criado para migrar assinantes com proration
- [x] Script `sendPromoCampaign.js` + `sendPromoEmail` (emailService) — campanha pontual de cupom promocional (50%) por email para usuários do plano free, com passo a passo de aplicação do cupom no Checkout
- [x] Redução de preços (set/2026): novos preços R$19,90/29,90/49,90 (Starter/Pro/Business), atualizados em `config/plans.js`, `seedStripeProducts.js` e `landing/index.html`

## Pendente — Pós-Deploy

- [ ] Rodar `seedStripeProducts.js` com as novas chaves Stripe para gerar os novos price IDs (R$19,90/29,90/49,90)
- [ ] Atualizar `.env` com `STRIPE_PRICE_*` (novos) e `OLD_STRIPE_PRICE_*` (antigos, os de R$99,90/139,90/199,90)
- [ ] Rodar `migrateExistingSubscriptions.js` com `DRY_RUN=true`, revisar log, depois aplicar
- [ ] Reiniciar o processo do backend em produção para recarregar `.env`

## Melhorias Identificadas

- [ ]* 5. Adicionar endpoint para listar histórico de faturas via Stripe API
- [ ]* 6. Implementar notificação por email quando subscription entra em `past_due`
- [ ]* 7. Adicionar suporte a cupons de desconto no checkout (já tem `allow_promotion_codes: true`, mas sem UI dedicada)
