# AppLayout — Design

## Arquivos

- `src/components/AppLayout.jsx`

## Implementação

`AppLayout` usa `Outlet` do React Router e consome `AuthContext` e `NotificationContext`. Bloqueios por plano enviam para `/plans`; bloqueios por permissão impedem navegação.
