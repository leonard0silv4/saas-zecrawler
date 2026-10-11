# Rotas e Proteção — Design

## Arquivos

- `src/App.jsx`
- `src/contexts/AuthContext.jsx`
- `src/contexts/NotificationContext.jsx`
- `src/components/AppLayout.jsx`

## Implementação

As rotas internas ficam sob `NotificationProvider` e `AppLayout`. `ProtectedRoute`, `PublicRoute`, `ModuleRoute` e `OwnerRoute` concentram as regras de acesso. As props `exatc` usadas em duas rotas são ignoradas pelo React Router e podem ser removidas.

## Code-splitting (2026-10)

- Todas as páginas em `App.jsx` são carregadas com `lazyPage(() => import(...))` (`src/lib/lazyPage.js`), um `React.lazy` que recarrega a página uma vez se o arquivo da rota não existir mais (aba aberta antes de um deploy).
- `Suspense` em dois níveis: em volta de `<Routes>` (tela cheia, páginas públicas) e em volta do `<Outlet />` no `AppLayout` (menu e topo continuam visíveis enquanto a página baixa). Fallback: `components/PageLoader.jsx`.
- `vite.config.js` separa bibliotecas em chunks próprios (`react`, `charts`, `motion`, `query`, `dates`) para cache entre deploys.
