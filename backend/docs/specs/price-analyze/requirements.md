# Requisitos — Módulo de Análise de Preços

## Visão Geral

Gera análises comparativas de preços a partir dos links cadastrados, identificando produtos próprios vs. concorrentes. Produz um XML compatível com ferramentas de precificação e armazena o último snapshot gerado.

---

## Requisitos Funcionais

### RF-01 Visão Rápida (sem scraping)
- `GET /price-analyze` retorna grupos de produtos construídos a partir dos dados já salvos nos links.
- Agrupa links pelo SKU do produto.
- Identifica anúncios próprios pela tag `MY_STORE_TAG` nos links.
- Retorna `{ productGroups, extractionDate, hint }`.

### RF-02 Geração de XML
- `POST /price-analyze/generate` faz scraping completo de todos os links do owner (ou de um `storeName` específico).
- Limite configurável de URLs a processar (1–500, padrão 300).
- Usa `scrapePriceAnalyzeFromLinks` com callback de progresso.
- Gera XML via `buildPriceAnalyzeXml`.
- Salva o XML no `PriceAnalyzeSnapshot` do owner (upsert — apenas um snapshot por owner).
- Retorna `{ ok, extractionDate, urlsProcessadas, linhasProduto, message }`.

### RF-03 Download do XML
- `GET /price-analyze/xml` retorna o último XML gerado com `Content-Type: application/xml`.
- Se nenhum XML foi gerado ainda, retorna HTTP 404.

### RF-04 Identificação de Anúncios Próprios
- Links com a tag `MY_STORE_TAG` são marcados como anúncios do próprio vendedor na análise.
- O owner configura seus nomes de seller em `Settings` (`mySellerNames`).

---

## Requisitos Não-Funcionais

- A geração de XML pode ser longa; o timeout da requisição é desabilitado (`req.setTimeout(0)`).
- Apenas um snapshot por owner (upsert por `ownerId`).
- O XML é armazenado como string no banco (campo `xml` do `PriceAnalyzeSnapshot`).

---

## Modelo de Dados — PriceAnalyzeSnapshot

| Campo | Tipo | Descrição |
|---|---|---|
| `ownerId` | ObjectId (unique) | Dono do snapshot |
| `xml` | String | Conteúdo XML gerado |
| `extractionDate` | Date | Data/hora da geração |
| `rowCount` | Number | Linhas com preço > 0 |
| `sourceUrlCount` | Number | Total de URLs processadas |

---

## Propriedades de Correção

- **P1**: Após `POST /price-analyze/generate`, `PriceAnalyzeSnapshot.findOne({ ownerId })` deve retornar exatamente um documento com `xml` não-vazio.
- **P2**: `GET /price-analyze/xml` sem snapshot gerado deve retornar HTTP 404.
- **P3**: Links com `MY_STORE_TAG` devem ser identificados como anúncios próprios nos `productGroups`.
- **P4**: `rowCount` deve ser igual ao número de linhas no XML com `preco > 0`.
