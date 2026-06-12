# PriceAnalyzePage — Design

## Arquivos

- `src/pages/PriceAnalyzePage.jsx`
- `src/lib/priceAnalyzeXml.js`

## Implementação

Usa `@tanstack/react-query` com query key `["price-analyze-xml"]` e `staleTime: Infinity` (o XML só muda após geração explícita). O `queryFn` chama `fetchPriceAnalyzeXmlText()` que usa `fetch()` nativo para distinguir 404 (sem XML ainda) de erros reais. Após geração via POST, invalida a query para forçar reload. O parsing do XML em `productGroups` e `extractionDate` é feito via `useMemo` sobre os dados da query.
