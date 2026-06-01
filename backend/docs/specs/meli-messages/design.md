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
  // + filtros opcionais: status, user_id, $or search
}
```

## Índices MongoDB

```javascript
meliQuestionSchema.index({ ownerId: 1, user_id: 1, status: 1 });
meliQuestionSchema.index({ ownerId: 1, question_id: 1 }, { unique: true });
meliMessageTemplateSchema.index({ ownerId: 1, name: 1 }, { unique: true });
```

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
