# Contextos Globais — Requirements

## Escopo

Estado global de autenticação, autorização, notificações e cookies.

## Requisitos

- `AuthContext` deve restaurar sessão do `localStorage` e validar com `GET /auth/me`.
- `AuthContext` deve expor login, cadastro, logout, refresh, billing, delete account e helpers de acesso.
- `NotificationContext` deve carregar `GET /meli/messages/unread-count` e `GET /cookies/status`.
- `NotificationContext` deve fazer polling de mensagens a cada 90 segundos quando a aba estiver visível.
