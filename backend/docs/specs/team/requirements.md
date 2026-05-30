# Team — Requirements

## Visão Geral

Gestão owner-only de subusuários, times e permissões.

## Requisitos Funcionais

- RF-01 `GET /team/users` deve listar subusuários do owner sem senha.
- RF-02 `POST /team/users` deve criar membro com senha criptografada.
- RF-03 `PUT /team/users/:id` deve alterar nome, permissões e times.
- RF-04 `PUT /team/users/:id/password` deve validar senha mínima e atualizar hash.
- RF-05 `DELETE /team/users/:id` deve remover usuário e referências em times.
- RF-06 Endpoints de times devem criar, listar, editar e excluir times do owner.
- RF-07 Membros só podem ser adicionados/removidos em times do mesmo owner.
- RF-08 Permissões devem ser sanitizadas contra módulos válidos.

## Requisitos Não-Funcionais

- Todas as consultas devem respeitar isolamento por owner quando o recurso for de cliente.
- Erros devem retornar JSON com campo `error`.
