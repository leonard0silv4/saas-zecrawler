# MeliMessagesPage — Design

## Arquivos

- `src/pages/MeliMessagesPage.jsx` — lógica de estado e handlers (reformulado em 2026-05-30)
- `src/components/meli-messages/AccountSelector.jsx` — seletor de contas ML + filtro de status
- `src/components/meli-messages/ConversationList.jsx` — painel esquerdo: lista de conversas agrupadas por comprador
- `src/components/meli-messages/ChatThread.jsx` — painel direito: thread de chat + card de anúncio + formulário de resposta
- `src/components/meli-messages/TemplateEditor.jsx` — seção de gerenciamento de templates

## Implementação

O estado completo permanece em `MeliMessagesPage` — os componentes filhos recebem tudo via props.

**Agrupamento de conversas:** `useMemo` sobre `questions` agrupa por `from_id`, calcula `lastDate`, `unansweredCount`, `lastQuestionText`. Ordenado por `lastDate` DESC.

**Seleção de conversa:** `selectedConversationFromId` (Number | null) substitui o antigo `selectedQuestionId`. Auto-seleção da primeira conversa via `useEffect` sobre `conversations`.

**Pergunta ativa:** `activeQuestion` = primeira UNANSWERED da conversa (ou a última se todas respondidas). Usada para enviar resposta e para abrir o permalink do anúncio.

**Card de anúncio:** `listingProduct` (estado) buscado via `GET /meli/items/:itemId/details` sempre que `activeQuestion.item_id` muda. Retorna dados completos do `MeliProduct` no MongoDB: `title, thumbnail, price, available_quantity, status, permalink`. Independente do estado `products` do formulário de busca.

**Chat bubbles:** `buyerThread` (carregado da API ao selecionar conversa) renderizado com bolhas à esquerda (comprador, `bg-gray-100`) e à direita (vendedor, `bg-brand-600`). Auto-scroll para o fim via `useRef + useEffect`.

**Refresh do thread:** `buyerThreadRefreshKey` (incrementado em `sendManualReply` e `confirmDeleteQuestion`) força recarregamento sem trocar a conversa selecionada.

**Polling:** `QUESTIONS_POLL_MS = 5min`, pausa se `document.hidden`.

**Hashtag autocomplete:** regex `/(^|\s)#(\w*)$/` sobre o texto antes do cursor; seleção por teclado (ArrowUp/Down, Enter, Escape).

## Reformulação 2026-05-30 (chat redesign)

- `QuestionList.jsx` substituído por `ConversationList.jsx` (agrupamento por comprador, avatares com iniciais, badges de pendentes)
- `ReplyComposer.jsx` substituído por `ChatThread.jsx` (bolhas de chat, `ListingCard` embutido, auto-scroll)
- `selectedQuestionId` → `selectedConversationFromId`
- Adicionado `buyerThreadRefreshKey` para forçar reload do thread sem trocar conversa
