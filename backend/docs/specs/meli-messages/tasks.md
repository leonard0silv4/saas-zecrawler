# Tasks — Módulo de Mensagens ML

## Cobertura de Testes

- [ ] 1. Testes existentes em `meliMessagesAccess.test.js` e `meliMessagesServiceMapper.test.js` — verificar cobertura atual
- [ ] 2. Teste para filtros de listagem — perguntas com status inválido ou anúncio inativo não aparecem
- [ ] 3. Teste para `replyQuestion` — resposta > 2000 chars retorna 400; template inativo retorna 404
- [ ] 4. Teste para `unreadCount` — aplica os mesmos filtros da listagem
- [ ] 5. Teste para template com nome duplicado — retorna 409

## Correções

- [x] 6. Capturar `sale_price` do ML API no sync — corrigir preço exibido quando há desconto ativo (`item.sale_price?.amount` em `mapItemToProductDoc`; campo `sale_price` adicionado ao schema `MeliProduct`)

## Melhorias Identificadas

- [ ]* 6. Adicionar suporte a respostas automáticas baseadas em palavras-chave
- [x] 7. Webhook `/hookmessages` + notificação SSE `meli:question` em tempo real quando nova pergunta chega do ML; inclui fallback por `items` com mapeamento por conta, item cacheado ou sincronização global com cooldown quando o painel ML não envia `questions`
- [ ]* 8. Exportar histórico de perguntas/respostas para CSV
