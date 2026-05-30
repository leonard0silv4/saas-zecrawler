# Dashboard — Requirements

## Visão Geral

Agregação de métricas exibidas na página inicial autenticada.

## Requisitos Funcionais

- RF-01 `GET /dashboard/stats` deve retornar estatísticas de links do owner autenticado.
- RF-02 Deve retornar métricas de seller monitor apenas quando o usuário possui `sellerMonitor` em `allowedModules`.
- RF-03 Deve retornar métricas de mensagens apenas quando o usuário possui `meliMessages` em `allowedModules`.
- RF-04 Deve calcular competitividade de links com base em anúncios ganhando/perdendo.
- RF-05 Deve calcular alertas de sellers do dia, série dos últimos 15 dias e top sellers.
- RF-06 Deve calcular volume, taxa de resposta, tempo médio e pico de perguntas ML.

## Requisitos Não-Funcionais

- Todas as consultas devem respeitar isolamento por owner quando o recurso for de cliente.
- Erros devem retornar JSON com campo `error`.
