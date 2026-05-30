# LinksPage — Requirements

## Escopo

Gerenciamento de links monitorados em `/links`.

## Requisitos

- Deve listar links com filtros e paginação.
- Deve carregar tags, sellers e estatísticas.
- Deve criar, editar e excluir links.
- Deve respeitar limite de links do plano.
- Deve executar refresh via streaming em `/api/links/refresh/{storeName}`.
- Deve exibir inteligência de receita quando houver dados suficientes.
