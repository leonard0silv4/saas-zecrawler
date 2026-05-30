# Admin Panel — Requirements

## Visão Geral

Painel operacional separado da autenticação normal do SaaS.

## Requisitos Funcionais

- RF-01 `POST /panel/login` deve validar `ADMIN_USER` e `ADMIN_PASS` do ambiente.
- RF-02 Deve retornar 503 quando credenciais admin não estiverem configuradas.
- RF-03 `GET /panel/stats` deve retornar estatísticas globais da plataforma.
- RF-04 `GET /panel/customers` deve listar owners com plano, assinatura e uso agregado.
- RF-05 Rotas protegidas devem exigir JWT admin via `adminAuth`.

## Requisitos Não-Funcionais

- Todas as consultas devem respeitar isolamento por owner quando o recurso for de cliente.
- Erros devem retornar JSON com campo `error`.
