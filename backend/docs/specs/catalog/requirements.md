# Catalog — Requirements

## Visão Geral

Cadastro de produtos, dimensões e importação XLSX usados no cálculo de pacote.

## Requisitos Funcionais

- RF-01 `GET /catalog` deve listar produtos do owner com busca e paginação por cursor.
- RF-02 `POST /catalog` deve criar produto vinculado ao owner.
- RF-03 `PUT /catalog/:id` deve atualizar apenas produto do owner.
- RF-04 `DELETE /catalog/:id` deve remover apenas produto do owner.
- RF-05 `POST /catalog/import` deve importar XLSX em memória e ignorar SKUs duplicados.
- RF-06 A importação deve calcular `pesoCubico` como `(largura * comprimento * altura) / 6000`.

## Requisitos Não-Funcionais

- Todas as consultas devem respeitar isolamento por owner quando o recurso for de cliente.
- Erros devem retornar JSON com campo `error`.
