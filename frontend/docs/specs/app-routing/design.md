# Rotas e Proteção — Design

## Arquivos

- `src/App.jsx`
- `src/contexts/AuthContext.jsx`
- `src/contexts/NotificationContext.jsx`
- `src/components/AppLayout.jsx`

## Implementação

As rotas internas ficam sob `NotificationProvider` e `AppLayout`. `ProtectedRoute`, `PublicRoute`, `ModuleRoute` e `OwnerRoute` concentram as regras de acesso. As props `exatc` usadas em duas rotas são ignoradas pelo React Router e podem ser removidas.
