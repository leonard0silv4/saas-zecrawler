# Tasks — Data Retention

## Implementado

- [x] 1. Criar `dataCleanupService.js` com `runDataCleanup()` — deleção de questions, orders e alerts com > 90 dias
- [x] 2. Registrar cron diário às 3h em `cron.js`
- [x] 3. Limpeza de produtos órfãos ao final de `syncProductsForConta` no `MeliController.js`

## Melhorias Futuras

- [ ]* 4. Tornar `RETENTION_DAYS` configurável por plano (ex: free = 30 dias, business = 90 dias)
- [ ]* 5. Endpoint admin para forçar execução manual da limpeza
- [ ]* 6. Métricas de deleção salvas em log estruturado ou collection de auditoria
