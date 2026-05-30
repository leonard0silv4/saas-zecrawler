# Rotas e Proteção — Requirements

## Escopo

Define o comportamento de roteamento declarado em `src/App.jsx`.

## Requisitos

- A rota `/` deve redirecionar para `/login`.
- Rotas públicas institucionais devem renderizar sem autenticação.
- `/login` e `/register` devem redirecionar usuários autenticados para `/dashboard`.
- Rotas internas devem exigir usuário autenticado via `ProtectedRoute`.
- Rotas de módulo devem bloquear acesso quando `canAccess(module)` for falso.
- `/team` deve exigir owner via `OwnerRoute`.
- Rotas desconhecidas devem redirecionar para `/dashboard`.
- `/expedicao` e `/nfe` devem redirecionar para `/dashboard` enquanto os módulos não estiverem ativos.
