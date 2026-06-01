# Contextos Globais — Design

## Arquivos

- `src/contexts/AuthContext.jsx`
- `src/contexts/NotificationContext.jsx`

## Implementação

`AuthContext` mantém sessão em memória e no browser. `NotificationContext` depende do usuário autenticado e alimenta badges e banner de cookies no layout. Também abre uma conexão `EventSource` em `/api/events?token=<jwt>`; ao receber `meli:question`, atualiza `lastMeliQuestionEvent` e recarrega a contagem de mensagens não lidas.
