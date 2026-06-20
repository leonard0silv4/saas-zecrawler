# MeliMessagesPage — Design

## Arquivos

- `src/pages/MeliMessagesPage.jsx` — lógica de estado e handlers
- `src/components/meli-messages/AccountSelector.jsx` — dropdown de loja + filtros Pendentes/Respondidas + badge de contagem de conversas
- `src/components/meli-messages/ConversationList.jsx` — painel esquerdo: lista de conversas agrupadas por comprador; inclui toggle de ordenação (asc/desc) no header
- `src/components/meli-messages/ChatThread.jsx` — painel direito: thread de chat + ItemContextCard + formulário de resposta
- `src/components/meli-messages/TemplateModal.jsx` — modal com abas Templates (inserir) e Gerenciar (CRUD)
- `src/components/meli-messages/ProductSearchModal.jsx` — modal para buscar e inserir link de anúncio

## Implementação

O estado completo permanece em `MeliMessagesPage` — os componentes filhos recebem tudo via props.

**Agrupamento de conversas:** helper `buildConversations(questions, sortOrder, searchTerm)` em `components/meli-messages/utils.js` agrupa por `from_id`, calcula `lastDate`, `unansweredCount`, `lastQuestionText` e (quando `searchTerm`) `matchSnippet`. Ordenado por `lastDate` de acordo com `sortOrder` ("desc" = mais novas, "asc" = mais antigas). Usado tanto pela lista normal quanto pela lista de resultados de busca.

**Busca global (estilo WhatsApp):** campo de busca no header de `ConversationList`. `searchInput` (controlado) → `searchTerm` (debounce 300ms, ativa com ≥ 2 chars). Query separada `["messages-search", userId, status, term]` chama `GET /meli/messages/questions?search=<termo>&limit=100` (não toca na query principal `questions`, evitando interferência com update otimista/SSE/prefetch). `displayConversations = isSearching ? searchConversations : conversations`. O termo é destacado com `<mark>` no nome e no snippet; cada card mostra o `matchSnippet` (trecho da pergunta ou da resposta que casou). A busca limpa ao trocar de conta/status. `selectedConversation` procura nas duas listas e, como fallback, monta a conversa a partir do `buyerThread` carregado — garantindo que clicar em qualquer resultado abra a thread.

**Seleção de conversa:** `selectedConversationFromId` (Number | null). Auto-seleção da primeira conversa via `useEffect` sobre `conversations`.

**Pergunta ativa:** `activeQuestion` = primeira UNANSWERED da conversa (ou a última se todas respondidas). Usada para enviar resposta.

**Listing products:** `listingProductsMap` (Map\<itemId, product\>) substituiu o antigo `listingProduct` (único). A cada mudança em `buyerThread`, todos os `item_id` únicos são buscados via `GET /meli/items/:itemId/details` e adicionados ao map (sem re-fetch se já presente). O map é limpo ao trocar de conversa.

**ItemContextCard:** renderizado inline no `buyerThread.map()` toda vez que o `item_id` muda em relação ao item anterior (`let prevItemId = null`). Exibe thumbnail, badge de status colorido, preço e botão de link externo. Centralizado na thread, visualmente subordinado às bolhas — contexto, não conteúdo. O preço exibido usa `sale_price ?? price` para refletir o preço efetivo de venda (quando há promoção ativa, `sale_price` < `price`; `price` é o preço de tabela/riscado no ML).

**Chat bubbles:** `buyerThread` renderizado com bolhas à esquerda (comprador, `bg-gray-100`) e à direita (vendedor, `bg-brand-600`). Auto-scroll para o fim via `useRef + useEffect`.

**Update otimista:** após `POST /reply` retornar com sucesso, `setBuyerThread` e `setQuestions` são atualizados imediatamente antes de `loadQuestions()` em background.

**Refresh do thread:** `buyerThreadRefreshKey` (incrementado pós-envio/exclusão) força recarregamento sem trocar a conversa selecionada.

**Polling:** `QUESTIONS_POLL_MS = 5min`, pausa se `document.hidden`. Mantido como fallback ao webhook.

**Tempo real:** `NotificationContext` expõe `lastMeliQuestionEvent` recebido por SSE (`meli:question`). Quando o evento pertence à conta selecionada, ou quando vem sem `user_id` por fallback global, `MeliMessagesPage` executa `loadQuestions({ silent: true })`; se o `from_id` é a conversa aberta, incrementa `buyerThreadRefreshKey` para recarregar a thread.

**Hashtag autocomplete:** regex `/(^|\s)#(\w*)$/` sobre o texto antes do cursor; seleção por teclado (ArrowUp/Down, Enter/Tab, Escape).

**Modal de templates:** aba "Templates" filtra templates ativos por nome/conteúdo e insere no textarea ao clicar; aba "Gerenciar" expõe o CRUD completo. Aberto via botão `# Templates` abaixo do textarea.

**Modal de anúncios:** campo de busca filtra `filteredProducts`; ao clicar insere o permalink no textarea com saudação contextual. Aberto via botão `Anúncios` abaixo do textarea.

**Layout 100vh:** `MeliMessagesPage` usa `flex flex-col h-full`; o grid `lg:grid-cols-5` tem `flex-1 min-h-0`; `ConversationList` e `ChatThread` têm `overflow-y-auto` sem `max-h` fixo — a altura é controlada pelo pai.

**AccountSelector:** dropdown de loja com badge vermelho por conta; botões Pendentes/Respondidas e badge de contagem de conversas. O toggle de ordenação fica no header de `ConversationList`.

**threadSortOrder:** estado separado de `sortOrder` (lista de conversas). Controla a ordem das mensagens *dentro* do thread — padrão `"asc"` (mais antigas no topo). Toggle via botão no header do `ChatThread`.

**Smart suggestions:** `useSmartSuggestions(activeQuestion?.text)` retorna sugestões rápidas com base no texto da pergunta ativa. Exibidas como botões clicáveis acima do textarea no `ChatThread`.

**Busca de anúncios:** `GET /meli/products/autocomplete?q=<query>` com debounce de 300ms alimenta o `ProductSearchModal` (máx. 8 resultados via `filteredProducts` useMemo). Distinto de `GET /meli/items/:itemId/details` (detalhes dos itens do thread) e `GET /meli/items/:itemId/permalink` (abrir link externo quando permalink não está no cache `listingProductsMap`).

## Reformulação 2026-05-31 (redesign UX)

- `TemplateEditor` removido da página → `TemplateModal` com abas
- Busca de produto inline removida de `ChatThread` → `ProductSearchModal`
- `listingProduct` (único) → `listingProductsMap` (Map por item_id)
- `ListingCard` fixo no topo removido → `ItemContextCard` inline na timeline
- `AccountSelector` convertido de botões horizontais para dropdown
- Layout alterado para `h-full flex flex-col` (100vh sem scroll de página)
- `sortOrder` adicionado à ordenação de conversas
- `threadSortOrder` adicionado para ordenar mensagens dentro do thread (independente do `sortOrder` da lista de conversas)
- Update otimista em `sendManualReply`
