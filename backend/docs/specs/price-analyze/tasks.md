# Tasks — Módulo de Análise de Preços

## Cobertura de Testes

- [ ] 1. Teste unitário para `buildProductGroupsFromLinks` — links com MY_STORE_TAG são marcados como próprios
- [ ] 2. Teste para `GET /price-analyze/xml` sem snapshot — deve retornar 404
- [ ] 3. Teste para upsert do snapshot — gerar XML duas vezes deve resultar em apenas um documento por owner

## Melhorias Identificadas

- [ ]* 4. Adicionar progresso via SSE durante a geração do XML (atualmente só loga no console)
- [ ]* 5. Histórico de snapshots (atualmente só guarda o último)
- [ ]* 6. Exportar análise em formato CSV além de XML

- [x] Fix (set/2026): coleta migrada de scraping (bloqueado por captcha/bot challenge do ML) para a API oficial (`/products`, `/products/{id}/items`, `/items`, `/sites/MLB/search`) com token de conta ML conectada.
- [x] Validado: `/sites/MLB/search` responde 403 (set/2026) → URLs de listagem e anúncios fora de catálogo não são processados; catálogo (`/p/MLB`) funciona.
