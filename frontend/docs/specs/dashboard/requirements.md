# DashboardPage — Requirements

## Escopo

Página inicial autenticada em `/dashboard`.

## Requisitos

- Deve exibir saudação com primeiro nome.
- Deve buscar estatísticas em `GET /dashboard/stats`.
- Deve exibir cards e painéis conforme módulos permitidos.
- Cards bloqueados por plano devem levar para `/plans`.
- Cards bloqueados por permissão devem impedir navegação.
- Deve permitir download do XML de análise de preços quando disponível.
