# Serviço de API — Requirements

## Escopo

Cliente HTTP compartilhado do frontend.

## Requisitos

- Deve usar `VITE_API_URL/api` quando `VITE_API_URL` existir.
- Deve usar `/api` em desenvolvimento.
- Deve anexar `Authorization: Bearer {token}` quando houver token.
- Deve remover sessão local e redirecionar para `/login` em HTTP 401.
