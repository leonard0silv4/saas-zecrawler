# MeliMessagesPage — Tasks

- [x] Documentar perguntas, respostas e templates.
- [x] Registrar endpoints auxiliares.
- [x] Extrair 4 componentes para `src/components/meli-messages/` (2026-05-30).
- [x] MeliMessagesPage reduzida de 1.036 → ~270 linhas.
- [x] Modal inline de exclusão substituído por `ConfirmDialog`.
- [x] Reformular para interface de chat: `ConversationList` + `ChatThread` (2026-05-30).
- [x] Agrupamento de perguntas por comprador (`from_id`).
- [x] Card de anúncio com dados do `MeliProduct` (thumbnail, preço, estoque, status).
- [x] Auto-scroll do chat ao mudar de conversa.
- [x] `buyerThreadRefreshKey` para refresh pós-envio/exclusão sem trocar conversa.
- [x] Redesign full-height: remover TemplateEditor do fundo, layout sem scroll externo (2026-05-31).
- [x] TemplateModal: gerenciamento e seleção de templates via modal com abas Usar/Gerenciar (2026-05-31).
- [x] ProductSearchModal: busca de anúncios via modal (2026-05-31).
- [x] Fix URL longa em bubbles de histórico com `break-words` (2026-05-31).
- [x] Fontes aumentadas nas bubbles e pergunta ativa (2026-05-31).
- [ ] Adicionar teste para autocomplete de templates.
- [ ] Validar refresh com `NotificationContext`.
