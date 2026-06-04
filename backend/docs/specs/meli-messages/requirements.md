# Requisitos — Módulo de Mensagens ML (Perguntas & Templates)

## Visão Geral

Gerencia perguntas de compradores no Mercado Livre, permitindo responder manualmente ou via templates pré-definidos. Recebe novas perguntas por webhook do Mercado Livre e mantém sincronização por cron a cada 5 minutos como fallback.

---

## Requisitos Funcionais

### RF-01 Listagem de Perguntas
- Filtra automaticamente perguntas com status inválido no ML: `UNDER_REVIEW`, `CLOSED_BY_ML`, `DISABLED`, `DELETED`, `BANNED`.
- Filtra perguntas de anúncios inativos: `paused`, `closed`, `under_review`, `inactive`.
- Filtra perguntas cuja resposta foi banida por moderação do ML (`answer_status: "BANNED"`).
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

### RF-10 Sugestões Rápidas Baseadas em Histórico
- `GET /meli/messages/suggestions?q=<texto>&user_id=<loja>` retorna até 5 sugestões de resposta.
- As sugestões são extraídas de perguntas já respondidas (`status: "ANSWERED"`) do mesmo owner, priorizando a loja selecionada.
- Quando a API não retorna resultados (sem histórico ou sem match), o frontend exibe sugestões estáticas baseadas em keyword matching como fallback.
- Sugestões duplicadas (mesmo texto normalizado) são removidas antes de retornar.

### RF-07 Templates de Resposta
- CRUD completo: criar, listar, atualizar, deletar.
- Nome único por owner.
- Campo `isActive` para ativar/desativar sem deletar.
- `lastUsedAt` atualizado automaticamente ao usar o template.

### RF-08 Sincronização Automática (Cron)
- A cada 5 minutos, sincroniza perguntas de todos os owners com contas ML ativas como fallback do webhook.
- Usa lock por owner para evitar sincronizações paralelas do mesmo owner.
- Busca perguntas mais recentes que a última sincronização.

### RF-09 Webhook de Perguntas ML
- `POST /hookmessages` recebe notificações públicas do Mercado Livre.
- Processa `topic: "questions"` diretamente. Como fallback local, quando chega `topic: "items"`, tenta sincronizar pela conta do `user_id`, depois pelo `item_id` em `MeliProduct` e, se ainda não houver mapeamento, antecipa a sincronização de todas as contas ativas com cooldown global de 60 segundos. Demais tópicos retornam HTTP 200 com `ignored: true`.
- Extrai o ID de `resource` (`/questions/:id`), localiza a `Conta` por `user_id`, busca a pergunta no ML e faz upsert em `MeliQuestion`.
- Quando `ML_APPLICATION_ID` estiver configurado, ignora notificações de outra aplicação.
- Após salvar a pergunta, emite SSE `meli:question` para o owner da conta.
- Retorna HTTP 200 mesmo quando o processamento falha, registrando erro para evitar retentativas excessivas do ML.

---

## Requisitos Não-Funcionais

- Módulo exclusivo do plano Business (`requireModule("meliMessages")`).
- Perguntas são armazenadas localmente para performance (cache do ML).
- `raw_payload` armazena o payload original do ML para diagnóstico.
- Webhook de mensagens deve ser público e idempotente; autenticação ocorre pela correspondência `user_id` -> `Conta` e, opcionalmente, por `ML_APPLICATION_ID`. Logs de eventos ignorados/processados ficam desativados por padrão e só aparecem com `ML_WEBHOOK_DEBUG=true`.

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
- **P7**: Perguntas com `answer_status: "BANNED"` nunca devem aparecer na listagem nem ser (re)inseridas pelo sync.
- **P3**: Resposta com mais de 2000 caracteres deve retornar HTTP 400.
- **P4**: `unreadCount` deve retornar apenas perguntas `UNANSWERED` aplicando os mesmos filtros da listagem.
- **P5**: Template com nome duplicado para o mesmo owner deve retornar HTTP 409.
- **P6**: O preço exibido para o anúncio deve refletir o preço efetivo de venda — quando houver promoção ativa (`sale_price`), esse valor deve ser capturado no sync e retornado pelo endpoint `/meli/items/:itemId/details`.
