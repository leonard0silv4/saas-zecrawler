# Requisitos — Módulo de Links (Monitoramento de Produtos)

## Visão Geral

Permite ao usuário cadastrar URLs de produtos do Mercado Livre para monitorar preços, vendedores e disponibilidade. Suporta cadastro individual, em lote (via URL de listagem), atualização manual e refresh automático via scraping.

---

## Requisitos Funcionais

### RF-01 Cadastro de Link Individual
- Aceita apenas URLs do domínio `mercadolivre.com` ou `mercadolibre.com`.
- Faz scraping da URL para extrair: SKU, nome, preço atual, vendedor, imagem, storeName, ratingSeller, flags `full` e `catalog`.
- Se já existe um link com mesmo `sku` + `ownerId` + `storeName`, atualiza o preço em vez de criar duplicata.
- Associa o link ao `ownerId` do usuário autenticado.
- Respeita o limite de links do plano (`checkLinkLimit`).

### RF-02 Cadastro em Lote
- Aceita uma URL de listagem do ML (página de resultados de busca ou loja).
- Extrai todos os links de produtos da página via `extractLinks`.
- Para cada link, faz scraping e cria ou atualiza o registro.
- Retorna `{ created, updated, total }`.

### RF-03 Listagem com Filtros e Paginação
- Filtros disponíveis: `storeName`, `tag`, `search` (nome), `sku`, `seller`, `status` (winning/losing).
- `winning`: `nowPrice > myPrice` e `myPrice > 0`.
- `losing`: `nowPrice < myPrice` e `myPrice > 0`.
- Ordenação por: `createdAt`, `nowPrice`, `myPrice`, `name` (asc/desc).
- Paginação via `page` e `perPage`.
- Retorna `{ data, total, page, perPage }`.

### RF-04 Atualização de Link
- Permite atualizar `myPrice` e `tags`.
- Apenas o owner do link pode atualizá-lo.

### RF-05 Exclusão
- Individual: por `_id`.
- Em lote: todos os links de um `storeName`.

### RF-06 Refresh de Preços (SSE)
- Atualiza todos os links de um `storeName` via scraping sequencial.
- Responde via Server-Sent Events (SSE) com progresso percentual e dados alterados.
- Mantém histórico dos últimos 20 preços por link (`history`, slice -20).
- Atualiza `lastPrice` quando `nowPrice` muda.

### RF-07 Estatísticas
- Retorna `totalCount`, `losingCount` e `losingMedianPrice` para um `storeName` (ou todos).

### RF-08 Tags e Vendedores
- `GET /links/tags` — lista todas as tags distintas do owner.
- `GET /links/sellers` — lista todos os sellers distintos do owner (ordenados).

### RF-09 Limpar Taxas
- `POST /links/clear-rates/:storeName` — iguala `lastPrice = nowPrice` para todos os links do storeName (zera indicadores de variação).

---

## Requisitos Não-Funcionais

- Todos os links são isolados por `ownerId` (multi-tenant).
- Índices compostos: `(ownerId, storeName)` e `(ownerId, sku)` para performance.
- O scraping respeita cookies ML do owner (passados via `ownerId`).

---

## Propriedades de Correção

- **P1**: Cadastrar o mesmo link duas vezes não deve criar duplicatas — deve atualizar o existente.
- **P2**: Um link com `nowPrice < myPrice` e `myPrice > 0` deve aparecer no filtro `status=losing`.
- **P3**: Após refresh, se o preço mudou, `history` deve conter a entrada mais recente e ter no máximo 20 entradas.
- **P4**: `GET /links` com `storeName=X` deve retornar apenas links onde `link.storeName === X` para o owner autenticado.
- **P5**: Links de outros owners nunca devem aparecer nas respostas.
