# Tasks — Módulo de Mensagens ML

## Cobertura de Testes

- [ ] 1. Testes existentes em `meliMessagesAccess.test.js` e `meliMessagesServiceMapper.test.js` — verificar cobertura atual
- [ ] 2. Teste para filtros de listagem — perguntas com status inválido ou anúncio inativo não aparecem
- [ ] 3. Teste para `replyQuestion` — resposta > 2000 chars retorna 400; template inativo retorna 404
- [ ] 4. Teste para `unreadCount` — aplica os mesmos filtros da listagem
- [ ] 5. Teste para template com nome duplicado — retorna 409

## Melhorias Identificadas

- [ ]* 6. Adicionar suporte a respostas automáticas baseadas em palavras-chave
- [ ]* 7. Notificação SSE em tempo real quando nova pergunta é sincronizada
- [ ]* 8. Exportar histórico de perguntas/respostas para CSV
