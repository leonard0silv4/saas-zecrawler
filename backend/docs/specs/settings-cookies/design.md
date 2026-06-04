# Settings e Cookies — Design

## Implementação

- Controllers: `SettingsController.js` e `CookieController.js`.
- Modelos usados: `User` e `Cookie`.
- `getOwnerId(req)` garante que subusuários leiam/escrevam no escopo do owner onde permitido.
- `CookieController.update` normaliza `sameSite`, `expiry`, booleanos e strings antes de inserir.
- `/cookies/status` é declarado antes de `/cookies` para evitar colisão de rota.

## Fallback de Cookie

Implementado em `src/utils/cookieLoader.js` — função `loadCookiesWithFallback(ownerId)`.

Quando um usuário não tem cookies cadastrados, o sistema busca automaticamente o conjunto de cookies de qualquer outro usuário do banco como fallback, para que os fluxos dependentes de cookie (inserção de link, price analyze, seller monitor) continuem funcionando.

Ordem de resolução:
1. Cookies próprios do usuário (`Cookie.find({ ownerId })`)
2. Cookies de qualquer outro usuário (`Cookie.findOne({ ownerId: { $ne: ownerId } })`)
3. Vazio — fluxo continua sem cookie (comportamento anterior)

O utilitário retorna `{ cookieString, isFallback }`. O `mlPriceAnalyzeScraper` ainda mescla o resultado com `ML_COOKIE_STRING` (env var) quando disponível. O fallback é transparente ao usuário; o banner de aviso no frontend permanece para incentivar o cadastro dos próprios cookies.
