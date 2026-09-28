# Settings e Cookies — Requirements

## Visão Geral

Configurações do owner e armazenamento de cookies Mercado Livre.

## Requisitos Funcionais

- RF-01 `GET /settings` deve retornar `mySellerNames` do owner.
- RF-02 `PUT /settings` deve aceitar apenas owner/admin e normalizar lista de lojas.
- ~~RF-03..RF-06 (endpoints `/cookies`)~~ — **removidos em set/2026**. A coleta de dados do ML passou a usar a API oficial com token OAuth da conta conectada; cookies não são mais usados. Dados legados podem ser apagados com `npm run purge:cookies` (`src/scripts/purgeLegacyCookies.js`); o model `Cookie` segue apenas para essa limpeza e a exclusão em cascata de contas.

## Requisitos Não-Funcionais

- Todas as consultas devem respeitar isolamento por owner quando o recurso for de cliente.
- Erros devem retornar JSON com campo `error`.
