# Dashboard — Design

## Implementação

- Endpoint: `GET /api/dashboard/stats` protegido por `authenticate`.
- Controller: `backend/src/controllers/DashboardController.js`.
- Modelos usados: `Link`, `SellerPage`, `SellerAlert`, `MeliQuestion`.
- O owner é resolvido com `getOwnerId(req)` para suportar subusuários.
- Blocos sem permissão são retornados como `null` em vez de provocar erro.
