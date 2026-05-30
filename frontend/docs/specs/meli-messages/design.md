# MeliMessagesPage — Design

## Arquivos

- `src/pages/MeliMessagesPage.jsx` — toda a lógica de estado (23 vars) e handlers
- `src/components/meli-messages/AccountSelector.jsx` — seletor de contas ML + filtro de status
- `src/components/meli-messages/QuestionList.jsx` — painel esquerdo de lista de perguntas
- `src/components/meli-messages/ReplyComposer.jsx` — painel direito de composição de resposta
- `src/components/meli-messages/TemplateEditor.jsx` — seção de gerenciamento de templates

## Implementação

O estado completo (contas, perguntas, reply, templates, produtos, hashtag autocomplete) permanece em `MeliMessagesPage` — os componentes filhos recebem tudo via props. Isso evita o lifting de state e mantém a lógica de polling centralizada.

**Polling:** `QUESTIONS_POLL_MS = 5min`, pausa se `document.hidden`.

**Buyer thread:** carregado por `useEffect` ao mudar `selectedQuestionId`. Cancelado via flag `cancelled` no cleanup.

**Hashtag autocomplete:** regex `/(^|\s)#(\w*)$/` sobre o texto antes do cursor; seleção por teclado (ArrowUp/Down, Enter, Escape).

## Refactor 2026-05-30

`MeliMessagesPage` reduzida de 1.036 → ~270 linhas. Modal inline de exclusão de pergunta substituído por `ConfirmDialog`.
