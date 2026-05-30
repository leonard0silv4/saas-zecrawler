# Tasks — Módulo de Análise de Preços

## Cobertura de Testes

- [ ] 1. Teste unitário para `buildProductGroupsFromLinks` — links com MY_STORE_TAG são marcados como próprios
- [ ] 2. Teste para `GET /price-analyze/xml` sem snapshot — deve retornar 404
- [ ] 3. Teste para upsert do snapshot — gerar XML duas vezes deve resultar em apenas um documento por owner

## Melhorias Identificadas

- [ ]* 4. Adicionar progresso via SSE durante a geração do XML (atualmente só loga no console)
- [ ]* 5. Histórico de snapshots (atualmente só guarda o último)
- [ ]* 6. Exportar análise em formato CSV além de XML
