# Tasks — Módulo de Billing

## Cobertura de Testes

- [ ] 1. Teste unitário para `syncSubscription` — status `canceled` deve zerar subscription e downgrade para free
- [ ] 2. Teste unitário para `computeAccess` — member com permissão `links` deve receber `priceAnalyze` automaticamente
- [ ] 3. Teste para `requireModule` — plano free não acessa `catalog`, `meli`, `meliMessages`, `meliAnalytics`
- [ ] 4. Teste para `checkLinkLimit` — retorna 403 quando count >= maxLinks

## Implementado

- [x] Constante `TRIAL_DAYS` centralizada em `config/plans.js` — usada no StripeController e exposta via `/api/plans`
- [x] Frontend exibe "X dias grátis" nos cards de planos pagos (PlansPage e PublicPricingPage)
- [x] Botão de upgrade mostra "Começar X dias grátis" em vez de "Assinar agora"
- [x] SettingsPlanSection exibe status "Em período de teste" com data de encerramento
- [x] Metadata de UI de planos centralizada em `frontend/src/config/plansMeta.js`

## Melhorias Identificadas

- [ ]* 5. Adicionar endpoint para listar histórico de faturas via Stripe API
- [ ]* 6. Implementar notificação por email quando subscription entra em `past_due`
- [ ]* 7. Adicionar suporte a cupons de desconto no checkout (já tem `allow_promotion_codes: true`, mas sem UI dedicada)
