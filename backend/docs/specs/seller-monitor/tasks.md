# Tasks — Módulo de Seller Monitor

## Cobertura de Testes

- [ ] 1. Teste para `runScrape` — retorna 409 quando scraping já está em andamento
- [ ] 2. Teste para cascata de deleção — deletar seller remove produtos e alertas
- [ ] 3. Teste para atualização de URL — produtos e alertas antigos são removidos antes do novo scraping
- [ ] 4. Teste para isolamento — alertas de seller de owner A não acessíveis por owner B

## Melhorias Identificadas

- [ ]* 5. Adicionar filtro de alertas por tipo (price_change / new_product) e por data
- [ ]* 6. Configurar intervalo de scraping por seller (atualmente só diário via cron)
- [ ]* 7. Notificação por email quando novos alertas são gerados
