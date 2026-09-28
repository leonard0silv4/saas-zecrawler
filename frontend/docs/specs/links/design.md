# LinksPage — Design

## Arquivos

- `src/pages/LinksPage.jsx` — state, filtros, tabela, paginação, lógica de refresh
- `src/components/links/AISection.jsx` — seção de inteligência de receita (projeções)
- `src/components/links/AddLinkModal.jsx` — modal de adição de link (usa `ui/Modal`)
- `src/components/links/EditLinkModal.jsx` — modal de edição de preço/tags (usa `ui/Modal`)
- `src/components/links/CatalogSuggestModal.jsx` — escolha manual de produto de catálogo para anúncios fora de catálogo (`apiBlocked`); busca editável, aviso de que o preço passa a ser o do catálogo

## Implementação

Usa `@tanstack/react-query` para todas as queries GET (`useQuery`). Após mutations (POST/PUT/DELETE), invalida os query keys relevantes com `queryClient.invalidateQueries`. O refresh de preços usa streaming (`fetch()` direto) e invalida o cache ao concluir.

Query keys: `["links", filters]`, `["links-tags"]`, `["links-sellers"]`, `["links-stats"]`. Tags e sellers têm `staleTime: 10min`.

**`SortableHeader`** permanece definido inline na função do componente principal (é muito pequeno e depende de closure sobre `sortConfig`/`handleSort`).

**`AISection`** está com `hidden` no Tailwind — a feature de projeção de receita existe mas está desabilitada na UI; extraída para arquivo próprio para facilitar reativação futura.

**Ações por linha**: botões diretos (ícones `Pencil` → editar, `Trash2` → excluir) na coluna Ações, sem menu de contexto ⋮. Abaixo dos botões aparece "Atualizado dd/MM HH:mm" (tooltip com a reputação do vendedor quando houver).

## Refactor 2026-05-30

`LinksPage` reduzida de 925 → ~550 linhas. Modais inline substituídos por `AddLinkModal` e `EditLinkModal` (ambos usam `ui/Modal`). `AISection` extraída para `components/links/AISection.jsx`.
