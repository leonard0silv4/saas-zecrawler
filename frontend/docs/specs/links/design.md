# LinksPage — Design

## Arquivos

- `src/pages/LinksPage.jsx` — state, filtros, tabela, paginação, lógica de refresh
- `src/components/links/AISection.jsx` — seção de inteligência de receita (projeções)
- `src/components/links/AddLinkModal.jsx` — modal de adição de link (usa `ui/Modal`)
- `src/components/links/EditLinkModal.jsx` — modal de edição de preço/tags (usa `ui/Modal`)

## Implementação

Mantém filtros e paginação localmente. O refresh usa streaming para acompanhar progresso. Integra com `/links`, `/links/tags`, `/links/sellers`, `/links/stats` e CRUD de links.

**`SortableHeader`** permanece definido inline na função do componente principal (é muito pequeno e depende de closure sobre `sortConfig`/`handleSort`).

**`AISection`** está com `hidden` no Tailwind — a feature de projeção de receita existe mas está desabilitada na UI; extraída para arquivo próprio para facilitar reativação futura.

## Refactor 2026-05-30

`LinksPage` reduzida de 925 → ~550 linhas. Modais inline substituídos por `AddLinkModal` e `EditLinkModal` (ambos usam `ui/Modal`). `AISection` extraída para `components/links/AISection.jsx`.
