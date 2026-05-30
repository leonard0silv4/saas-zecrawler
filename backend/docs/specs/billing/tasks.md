# Tasks — Módulo de Billing

## Cobertura de Testes

- [ ] 1. Teste unitário para `syncSubscription` — status `canceled` deve zerar subscription e downgrade para free
- [ ] 2. Teste unitário para `computeAccess` — member com permissão `links` deve receber `priceAnalyze` automaticamente
- [ ] 3. Teste para `requireModule` — plano free não acessa `catalog`, `meli`, `meliMessages`, `meliAnalytics`
- [ ] 4. Teste para `checkLinkLimit` — retorna 403 quando count >= maxLinks

## Melhorias Identificadas

- [ ]* 5. Adicionar endpoint para listar histórico de faturas via Stripe API
- [ ]* 6. Implementar notificação por email quando subscription entra em `past_due`
- [ ]* 7. Adicionar suporte a cupons de desconto no checkout (já tem `allow_promotion_codes: true`, mas sem UI dedicada)
