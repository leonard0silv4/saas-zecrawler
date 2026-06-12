# CatalogPage — Design

## Arquivos

- `src/pages/CatalogPage.jsx`

## Implementação

Usa `@tanstack/react-query` com query key `["catalog", search, cursor]`. A paginação cursor-based é mantida em estado local: ao clicar "Carregar mais", `appendRef.current = true` e o cursor avança; ao mudar a busca, o cursor reseta e items são substituídos. Após CRUD e importação, `resetList()` invalida o cache e reseta o cursor. O `nextCursor` é armazenado em `nextCursorRef` a cada resposta.

A rota `/catalog` fica protegida por `ModuleRoute module="catalog"` em `src/App.jsx`, alinhada à restrição de plano Pro/Business e às permissões do backend.
