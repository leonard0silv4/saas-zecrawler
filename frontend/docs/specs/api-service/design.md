# Serviço de API — Design

## Arquivos

- `src/services/api.js`

## Implementação

O serviço usa Axios com interceptors de request e response. Fluxos com streaming usam `fetch` diretamente, mantendo o prefixo `/api`.
