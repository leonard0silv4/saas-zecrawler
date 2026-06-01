# Requisitos — Módulo de Mensagens ML (Perguntas & Templates)

## Visão Geral

Gerencia perguntas de compradores no Mercado Livre, permitindo responder manualmente ou via templates pré-definidos. Sincroniza perguntas automaticamente via cron a cada 5 minutos.

---

## Requisitos Funcionais

### RF-01 Listagem de Perguntas
- Filtra automaticamente perguntas com status inválido no ML: `UNDER_REVIEW`, `CLOSED_BY_ML`, `DISABLED`, `DELETED`, `BANNED`.
- Filtra perguntas de anúncios inativos: `paused`, `closed`, `under_review`, `inactive`.
- Filtros opcionais: `status` (UNANSWERED/ANSWERED), `user_id`, `search` (texto ou título do anúncio).
- Paginação via `page` e `limit` (máximo 100 por página).
- Retorna `{ items, page, limit, total }`.

### RF-02 Responder Pergunta
- Aceita `text` (resposta manual) ou `templateId` (usa conteúdo do template).
- Limite de 2000 caracteres por resposta.
- Ao usar template, atualiza `lastUsedAt` do template.
- Retorna erros específicos: `ALREADY_ANSWERED` (409), `QUESTION_NOT_ACCESSIBLE` (404), `ML_API_ERROR` (status do ML).
- Para erro 403 do ML, inclui `hint` orientando o usuário a reconectar a conta.

### RF-03 Histórico de Comprador
- `GET /meli/messages/questions/buyer-thread?from_id=<id>` retorna todas as perguntas de um comprador específico.
- Ordenado por data crescente (cronológico).
- Retorna `{ items, from_nickname }`.

### RF-04 Exclusão de Pergunta
- Remove a pergunta do banco local (não afeta o ML).

### RF-05 Sincronização Manual
- `POST /meli/messages/sync` dispara sincronização imediata para o owner autenticado.

### RF-06 Contagem de Não Respondidas
- `GET /meli/messages/unread-count` retorna `{ perAccount: { [user_id]: count } }`.
- Aplica os mesmos filtros de status inválido e anúncio inativo da listagem.

### RF-07 Templates de Resposta
- CRUD completo: criar, listar, atualizar, deletar.
- Nome único por owner.
- Campo `isActive` para ativar/desativar sem deletar.
- `lastUsedAt` atualizado automaticamente ao usar o template.

### RF-08 Sincronização Automática (Cron)
- A cada 5 minutos, sincroniza perguntas de todos os owners com contas ML ativas.
- Usa lock por owner para evitar sincronizações paralelas do mesmo owner.
- Busca apenas perguntas `UNANSWERED` mais recentes que a última sincronização.

---

## Requisitos Não-Funcionais

- Módulo exclusivo do plano Business (`requireModule("meliMessages")`).
- Perguntas são armazenadas localmente para performance (cache do ML).
- `raw_payload` armazena o payload original do ML para diagnóstico.

---

## Modelo de Dados — MeliQuestion

| Campo | Tipo | Descrição |
|---|---|---|
| `ownerId` | ObjectId ref User | Dono |
| `user_id` | Number | ID da conta ML |
| `question_id` | Number (unique por owner) | ID da pergunta no ML |
| `item_id` | String | ID do anúncio |
| `item_title` | String | Título do anúncio |
| `from_id` | Number | ID do comprador |
| `from_nickname` | String | Apelido do comprador |
| `text` | String | Texto da pergunta |
| `status` | enum: UNANSWERED/ANSWERED | Status |
| `answer_text` | String | Texto da resposta |
| `answered_by` | enum: manual/template | Como foi respondida |
| `item_status` | String | Status do anúncio no ML |
| `raw_payload` | Mixed | Payload original do ML |

---

## Propriedades de Correção

- **P1**: Perguntas com `raw_payload.status` em `[UNDER_REVIEW, CLOSED_BY_ML, DISABLED, DELETED, BANNED]` nunca devem aparecer na listagem.
- **P2**: Perguntas com `item_status` em `[paused, closed, under_review, inactive]` nunca devem aparecer na listagem.
- **P3**: Resposta com mais de 2000 caracteres deve retornar HTTP 400.
- **P4**: `unreadCount` deve retornar apenas perguntas `UNANSWERED` aplicando os mesmos filtros da listagem.
- **P5**: Template com nome duplicado para o mesmo owner deve retornar HTTP 409.
- **P6**: O preço exibido para o anúncio deve refletir o preço efetivo de venda — quando houver promoção ativa (`sale_price`), esse valor deve ser capturado no sync e retornado pelo endpoint `/meli/items/:itemId/details`.
