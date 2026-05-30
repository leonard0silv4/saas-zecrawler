# Design — Módulo de Análise de Preços

## Endpoints

```
GET  /price-analyze          →  requireModule("priceAnalyze") → PriceAnalyzeController.index
GET  /price-analyze/xml      →  requireModule("priceAnalyze") → PriceAnalyzeController.xml
POST /price-analyze/generate →  requireModule("priceAnalyze") → PriceAnalyzeController.generate
```

## Fluxo de Geração de XML

```
POST /price-analyze/generate { storeName?, limit? }
  → req.setTimeout(0)  // sem timeout
  → Link.find({ ownerId, storeName? }).limit(limit)
  → scrapePriceAnalyzeFromLinks(links, ownerId, { onProgress })
      → para cada link: scraping ML + extração de dados de preço
      → retorna rows: [{ sku, nome, preco, vendedor, ... }]
  → buildPriceAnalyzeXml(rows, now)
  → PriceAnalyzeSnapshot.findOneAndUpdate({ ownerId }, { xml, extractionDate, rowCount, sourceUrlCount }, { upsert: true })
  → res.json({ ok, extractionDate, urlsProcessadas, linhasProduto })
```

## Fluxo de Visão Rápida

```
GET /price-analyze { storeName? }
  → Link.find({ ownerId, storeName? })
  → buildProductGroupsFromLinks(links)
      → agrupa por SKU
      → marca anúncios com MY_STORE_TAG como próprios
  → res.json({ productGroups, extractionDate, hint })
```

## Utilitários

### `buildProductGroupsFromLinks(links)`
- Agrupa links pelo SKU.
- Para cada grupo, separa anúncios próprios (tag `MY_STORE_TAG`) dos concorrentes.
- Calcula diferença de preço entre o próprio e o menor concorrente.

### `buildPriceAnalyzeXml(rows, date)`
- Gera XML estruturado com todos os produtos e seus preços.
- Compatível com ferramentas de precificação externas.

### `scrapePriceAnalyzeFromLinks(links, ownerId, options)`
- Faz scraping de cada link usando cookies ML do owner.
- Chama `options.onProgress({ current, total, url })` a cada iteração.
- Retorna array de rows com dados de preço.

## Configuração de Cookies

O scraping usa os cookies ML armazenados para o owner (via `Cookie` model), permitindo acesso a preços e dados que requerem autenticação no ML.
