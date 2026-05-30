# Tasks — Módulo de Links

## Cobertura de Testes

- [ ] 1. Teste unitário para `isMercadoLivreUrl` — aceita mercadolivre.com e mercadolibre.com, rejeita outros domínios
- [ ] 2. Teste de integração para `POST /links` — URL inválida retorna 400, URL ML válida cria link
- [ ] 3. Teste para deduplicação — cadastrar mesmo SKU+storeName duas vezes atualiza em vez de criar
- [ ] 4. Teste para filtro `status=losing` — retorna apenas links onde nowPrice < myPrice e myPrice > 0
- [ ] 5. Teste para isolamento multi-tenant — links de owner A não aparecem para owner B

## Melhorias Identificadas

- [ ]* 6. Adicionar campo `priceAlert` para notificar quando preço cai abaixo de um threshold
- [ ]* 7. Exportar links para CSV/XLS
- [ ]* 8. Adicionar suporte a links de outros marketplaces além do ML
