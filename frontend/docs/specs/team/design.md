# TeamPage — Design

## Arquivos

- `src/pages/TeamPage.jsx` — orquestração: state, tabs, listas, abertura de modais
- `src/components/team/ModuleCheckbox.jsx` — checkbox de módulo + `MODULE_LABELS` (exportado)
- `src/components/team/PermBadge.jsx` — pill de permissão (usa `MODULE_LABELS`)
- `src/components/team/UserForm.jsx` — formulário de criação/edição de usuário
- `src/components/team/TeamForm.jsx` — formulário de criação/edição de time
- `src/components/team/ChangePasswordModal.jsx` — modal de troca de senha (usa `ui/Modal`)
- `src/components/team/TeamMembersPanel.jsx` — painel expansível de membros do time

## Implementação

Usa abas para separar usuários e times. Formulários internos controlam permissões e vínculos. Integra com `/team/users` e `/team/teams`.

## Melhorias aplicadas (2026-05-30)

- Modal local genérico substituído pelo componente `ui/Modal`
- Confirmações de exclusão (usuário e time) migradas para `ConfirmDialog` em vez de `createPortal` inline
- 7 componentes inline extraídos para pasta dedicada `src/components/team/`
- `TeamPage` reduzida de 836 → ~200 linhas

## Endpoints

| Método | Rota | Uso |
|---|---|---|
| GET | `/team/users` | Listar usuários |
| POST | `/team/users` | Criar usuário |
| PUT | `/team/users/:id` | Editar usuário |
| PUT | `/team/users/:id/password` | Trocar senha |
| DELETE | `/team/users/:id` | Excluir usuário |
| GET | `/team/teams` | Listar times |
| POST | `/team/teams` | Criar time |
| PUT | `/team/teams/:id` | Editar time |
| DELETE | `/team/teams/:id` | Excluir time |
| POST | `/team/teams/:id/members` | Adicionar membro |
| DELETE | `/team/teams/:id/members/:uid` | Remover membro |
