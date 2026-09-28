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

## Fixes

- [x] Fix (set/2026): links cadastrados vazios (sem foto/preço/nome). ML passou a bloquear scraping (captcha wall com cookies, bot challenge sem cookies). Cadastro/refresh/cron migrados para a API oficial (`src/utils/meliProductApi.js`) com token de conta ML conectada do próprio owner. Testes de `parseMeliUrl` em `src/tests/linkScraper.test.js`.
- [ ] Validar `/sites/MLB/search` (importação em lote) com token em produção.
- [x] Correção de cadastros (set/2026): `links:refetch` corrigiu 93 links de catálogo; 106 links `/up/MLBU` ficam sem atualização (API do ML responde 403 para anúncios de outros vendedores).
- [ ] Definir estratégia para links fora de catálogo (`/up/MLBU…`) — API oficial não libera.
