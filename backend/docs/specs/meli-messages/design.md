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
