# Design — Módulo de Mensagens ML

## Endpoints

```
GET    /meli/messages/questions                        →  requireModule("meliMessages") → listQuestions
GET    /meli/messages/questions/buyer-thread           →  requireModule("meliMessages") → buyerThread
POST   /meli/messages/questions/:questionId/reply      →  requireModule("meliMessages") → replyQuestion
DELETE /meli/messages/questions/:questionId            →  requireModule("meliMessages") → deleteQuestion
GET    /meli/messages/templates                        →  requireModule("meliMessages") → listTemplates
POST   /meli/messages/templates                        →  requireModule("meliMessages") → createTemplate
PUT    /meli/messages/templates/:id                    →  requireModule("meliMessages") → updateTemplate
DELETE /meli/messages/templates/:id                    →  requireModule("meliMessages") → deleteTemplate
POST   /meli/messages/sync                             →  requireModule("meliMessages") → sync
GET    /meli/messages/unread-count                     →  requireModule("meliMessages") → unreadCount
GET    /meli/messages/suggestions                      →  requireModule("meliMessages") → getSuggestions
POST   /hookmessages                                  →  público → hookMessages (webhook ML questions)

GET    /meli/items/:itemId/details                     →  requireModule("meli") → getItemDetails
  → MeliProduct.findOne({ ownerId, id: itemId })
  → retorna { id, title, thumbnail, price, sale_price, available_quantity, status, permalink, SKU }
  → 404 se não encontrado no cache local

  Preços retornados:
  - `price`      = preço base/catálogo (campo `item.price` do ML — exibido riscado quando há promoção)
  - `sale_price` = preço promocional efetivo (campo `item.sale_price.amount` do ML); `null` quando sem promoção ativa
  - Preço a exibir ao usuário: `sale_price ?? price`
```

## Fluxo de Resposta

```
POST /meli/messages/questions/:questionId/reply { text?, templateId? }
  → se templateId e sem text:
      MeliMessageTemplate.findOne({ _id: templateId, ownerId, isActive: true })
      finalText = template.content
      template.lastUsedAt = now
  → finalText.length > 2000 ? 400
  → answerQuestion({ ownerId, questionId, text: finalText, answeredBy })
      → MeliQuestion.findOne({ ownerId, question_id: questionId })
      → se status === "ANSWERED" → throw { code: "ALREADY_ANSWERED" }
      → Conta.findOne({ ownerId, user_id: question.user_id })
      → token = renewToken(conta)
      → POST https://api.mercadolibre.com/answers { question_id, text }
      → MeliQuestion.findByIdAndUpdate({ status: "ANSWERED", answer_text, answered_by })
```

## Fluxo de Sincronização

```
syncQuestionsForOwner(ownerId):
  → Conta.find({ ownerId, ativas })
  → para cada conta:
      token = renewToken(conta)
      GET /questions/search?seller_id=user_id&status=UNANSWERED&sort_fields=date_created&sort_types=DESC
      para cada pergunta:
        GET /items/:item_id → item_status
        MeliQuestion.findOneAndUpdate({ ownerId, question_id }, { upsert: true })
  → retorna { syncedCount }
```

## Fluxo de Webhook

```
POST /hookmessages { topic, resource, user_id, application_id }
  → se ML_APPLICATION_ID estiver configurado e não bater: 200 ignored
  → se topic == "items": syncQuestionsForContaUserId(user_id); se não mapear, tenta MeliProduct por item_id; se ainda não mapear, sync global com cooldown de 60s; emitSSE se syncedCount > 0
  → se topic != "questions": 200 ignored
  → parseQuestionIdFromResource(resource)
  → Conta.findOne({ user_id, ativa })
  → token = renewToken(conta)
  → GET https://api.mercadolibre.com/questions/:id
  → mapQuestionPayload + MeliQuestion.updateOne({ ownerId, question_id }, upsert)
  → emitSSE(ownerId, "meli:question", { user_id, question_id, from_id, status })
  → sempre responde 200 para o Mercado Livre
```

## Cron de Sincronização

```
*/5 * * * *:
  ownerIds = Conta.distinct("ownerId", { ativas })
  para cada ownerId (com lock):
    syncQuestionsForOwner(ownerId)
```

## Filtros de Listagem

```javascript
const ML_INVALID_STATUSES = ["UNDER_REVIEW", "CLOSED_BY_ML", "DISABLED", "DELETED", "BANNED"];
const INACTIVE_ITEM_STATUSES = ["paused", "closed", "under_review", "inactive"];

filter = {
  ownerId,
  "raw_payload.status": { $nin: ML_INVALID_STATUSES },
  item_status: { $nin: INACTIVE_ITEM_STATUSES },
  answer_status: { $ne: "BANNED" }, // exclui respostas banidas por moderação (answer_banned_by_moderations)
  // + filtros opcionais: status, user_id, $or search
}
```

No sync (`syncQuestionsForConta`), além dos status inválidos da pergunta, perguntas com
`answer.status === "BANNED"` também são ignoradas — não são inseridas nem atualizadas no banco.

**Invariante de status durante sync:** O sync nunca faz downgrade de `"ANSWERED"` → `"UNANSWERED"`.
Quando a API do ML retorna uma pergunta sem `answer.text` (race condition ou atraso de propagação),
o campo `status` é omitido do `$set` para documentos existentes e definido apenas via `$setOnInsert`
para novos documentos. Isso garante que perguntas respondidas via nosso sistema não sejam sobrescritas.

## Fluxo de Sugestões Rápidas

```
GET /meli/messages/suggestions?q=<texto>&user_id=<loja>
  → extractKeywords(q): remove stopwords PT, tokens >= 3 chars, até 6 keywords
  → se keywords vazio → { suggestions: [] }
  → MeliQuestion.find({
      ownerId,
      status: "ANSWERED",
      answer_text: { $exists: true, $ne: "" },
      $or: [{ text: /kw1/i }, { text: /kw2/i }, ...]
    }).sort({ date_created: -1 }).limit(30)
  → rankAndDeduplicate(results, preferredUserId):
      - ordena: same-store primeiro
      - remove duplicatas por answer_text (primeiros 80 chars normalizados)
  → retorna top 5: { text, sourceQuestion, itemTitle, sameStore }

Frontend (useSmartSuggestions):
  → chama API quando activeQuestion.text muda
  → se API retorna resultados: usa answer_text das perguntas históricas
  → se API retorna vazio: fallback para SMART_SUGGESTIONS_RULES (keyword matching estático)

UI (ChatThread):
  → botão "Sugestões" (âmbar, FlaskConical icon) aparece no action row junto com Templates e Anúncios
  → botão só é renderizado quando smartSuggestions.length > 0
  → ao clicar abre Modal com badge "Experimental" + descrição + lista de sugestões clicáveis
  → clicar numa sugestão: insere no textarea via applySuggestion() e fecha a modal
```

## Índices MongoDB

```javascript
meliQuestionSchema.index({ ownerId: 1, user_id: 1, status: 1 });
meliQuestionSchema.index({ ownerId: 1, question_id: 1 }, { unique: true });
meliMessageTemplateSchema.index({ ownerId: 1, name: 1 }, { unique: true });
```

## Prefetch em background das outras lojas (2026-06-19)

Ao abrir a tela de Mensagens (`MeliMessagesPage.jsx`), o frontend dispara em background
o fetch das mensagens das **outras** contas ML (as não selecionadas), para que trocar de
loja seja instantâneo.

- **Sem novo endpoint:** reutiliza `GET /meli/messages/questions?user_id=<loja>&status=<filtro>&page=1&limit=50`
  (mais recentes primeiro — já cobre as do dia). Apenas o `statusFilter` ativo é prefetchado.
- **Mecanismo:** React Query `queryClient.prefetchQuery` com a mesma query key
  `["questions", userId, status]` do `useQuery` ativo, então a troca de loja serve do cache.
- **TTL curto:** `staleTime` 5 min (evita re-prefetch redundante) e `gcTime` 10 min
  (mantém o cache das lojas inativas). Revalidação em background continua via o
  `refetchInterval` de 5 min do `useQuery` de questions.

## UI Frontend (ajustes visuais — 2026-05-31)

Remodelagem visual dos componentes da página `/meli/messages` (apenas CSS/Tailwind, sem mudanças de lógica):

- **Geral**: cards passaram de `rounded-xl border-gray-100` para `rounded-lg border-gray-200 shadow-sm` — bordas mais definidas e sombra sutil.
- **AccountSelector**: padding maior (`p-5`), botões de conta com `shadow-md` no ativo e borda explícita no inativo, filtros com `shadow-sm` no selecionado e hover states nos inativos, badge de contagem com borda.
- **ConversationList**: header com `px-5 py-4`, título `font-bold text-base`, avatar `w-10 h-10` com `border border-brand-200`, badge de não-lidas com `shadow-md border border-white`, timestamps em `text-xs` com `font-medium`.
- **ChatThread**: header com `px-5 py-4`, avatar com border, bubbles do comprador com `px-4 py-3 max-w-xs`, bubbles do vendedor com `shadow-md`, botão Enviar com `font-bold shadow-sm hover:shadow-md`, textarea com `focus:ring-2`, label "Enviar resposta" → "Enviar".
- **TemplateEditor**: botão Criar mudou de `bg-gray-900` para `bg-brand-600` (consistência com o resto da UI), inputs com `focus:ring-2`, padding geral aumentado, label "Inserir na resposta" → "Inserir".

## UI Frontend (chat redesign — 2026-05-30)

A página `/meli/messages` foi reformulada para interface de chat:

- **ConversationList**: painel esquerdo — agrupa perguntas por `from_id` no frontend, exibe avatar com iniciais, badge de pendentes, preview da última pergunta.
- **ChatThread**: painel direito — bolhas de chat (comprador à esquerda, vendedor à direita) carregadas via `GET /meli/messages/questions/buyer-thread`. Inclui `ListingCard` com dados de `MeliProduct` buscados pelo `item_id` da pergunta ativa.
- **Pergunta ativa**: primeira `UNANSWERED` da conversa selecionada; todas as ações de resposta e exclusão operam sobre ela.
- **Listing card**: dados buscados via `GET /meli/items/:itemId/details` (endpoint dedicado que consulta `MeliProduct` no MongoDB por `ownerId + id`). Retorna `title, thumbnail, price, available_quantity, status, permalink, SKU`.
