# Meli Analytics — Tasks

## Cobertura de Testes

- [ ] Adicionar testes unitários para agregações de resumo, gráfico, top produtos, pedidos e inventário.
- [ ] Adicionar teste para tratamento de erro 403 na sincronização.
- [ ] Adicionar teste para sincronização automática no cron com múltiplas contas.

## Melhorias Identificadas

- [x] Documentar endpoints e fluxo de sincronização.
- [x] Documentar tratamento de erro 403.
- [x] Documentar visão unificada sem `user_id` e retorno `accounts` no sync.
- [x] Corrigir filtro de perguntas banidas na análise de IA (`questionFilter` sem `answer_status: BANNED`).
- [x] Adicionar insights de horários/dias de pico de vendas e perguntas à análise de IA (6º eixo).
- [ ] Padronizar payload de erro detalhado entre sync manual e cron.
- [ ] Medir custo das agregações em bases com alto volume de pedidos.
