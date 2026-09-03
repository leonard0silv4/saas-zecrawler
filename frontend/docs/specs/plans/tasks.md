# PlansPage — Tasks

- [x] Documentar checkout, portal e downgrade.
- [x] Redesign visual dos cards: barra de cor no topo, badge ring, plano atual destacado (Sessão D, 2026-05-30).
- [x] Substituir div.bg-blue-50 e div.bg-amber-50 pelo componente Alert.
- [ ] Revisar mensagens para estados de assinatura vencida/manual.
- [ ] Aplicar mesmas melhorias visuais em PublicPricingPage.
- [x] Reestruturação de planos (set/2026): `catalog`/`meliAnalytics`/`meliCatalog`/`meliMessages` liberados a partir do Starter (catalog inclusive Free); `GET /plans` passa a expor `modules`; `PublicPricingPage` gera a tabela comparativa dinamicamente em vez de `FEATURE_ROWS` hardcoded; `PlansPage`/`SettingsPlanSection` exibem `maxMeliAccounts`/`maxMonthlyMessages`; `AuthContext` perdeu o `moduleMap` de fallback.
