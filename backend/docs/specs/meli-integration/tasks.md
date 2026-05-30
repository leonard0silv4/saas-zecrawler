# Tasks — Módulo de Integração Mercado Livre

## Cobertura de Testes

- [ ] 1. Teste unitário para `computeRupturaAlert` — todas as combinações de isFull, availableQty e daysRestStock
- [ ] 2. Teste unitário para `renewToken` — não chama API se token não expirado; chama e salva se expirado
- [ ] 3. Teste para `disconnectAccount` — remove Conta, MeliProducts e MeliQuestions do user_id
- [ ] 4. Teste para `autocompleteProducts` — retorna apenas itens ativos com estoque

## Melhorias Identificadas

- [ ]* 5. Adicionar webhook ML para receber notificações de mudanças em anúncios em tempo real
- [ ]* 6. Exibir `authError` na UI para alertar o usuário sobre contas que precisam ser reconectadas
- [ ]* 7. Suporte a múltiplas contas ML com seleção na UI (atualmente usa a primeira conta disponível em algumas operações)
