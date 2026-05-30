# Settings e Cookies — Requirements

## Visão Geral

Configurações do owner e armazenamento de cookies Mercado Livre.

## Requisitos Funcionais

- RF-01 `GET /settings` deve retornar `mySellerNames` do owner.
- RF-02 `PUT /settings` deve aceitar apenas owner/admin e normalizar lista de lojas.
- RF-03 `GET /cookies` deve listar cookies do owner.
- RF-04 `POST /cookies` deve substituir cookies do owner por array válido não vazio.
- RF-05 `DELETE /cookies` deve limpar cookies do owner.
- RF-06 `GET /cookies/status` deve retornar `hasCookies` para o owner.

## Requisitos Não-Funcionais

- Todas as consultas devem respeitar isolamento por owner quando o recurso for de cliente.
- Erros devem retornar JSON com campo `error`.
