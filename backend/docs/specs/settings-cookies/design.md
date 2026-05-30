# Settings e Cookies — Design

## Implementação

- Controllers: `SettingsController.js` e `CookieController.js`.
- Modelos usados: `User` e `Cookie`.
- `getOwnerId(req)` garante que subusuários leiam/escrevam no escopo do owner onde permitido.
- `CookieController.update` normaliza `sameSite`, `expiry`, booleanos e strings antes de inserir.
- `/cookies/status` é declarado antes de `/cookies` para evitar colisão de rota.
