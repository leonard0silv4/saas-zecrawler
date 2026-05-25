# Plano — ZeCrawler SaaS

> Gerado em: 22/05/2026 | Branch: `main` | Último commit: `bb6e416`

---

## ✅ Funcionalidades Implementadas (sprint atual)

### 1. Sistema de Times (`add teams`)
**Commit:** `73b06cb`

- Modelo `Team` no backend com roles (owner / member)
- `TeamController` com CRUD completo de membros e permissões
- Middleware `plan.js` para checar limites de membros por plano
- Contexto de autenticação atualizado (`AuthContext`) com `isOwner`, `teamRole`
- Página `/team` no frontend (`TeamPage.jsx`) — invite, listar, remover membros
- Rotas protegidas por nível de acesso via `access.js`
- Testes unitários de permissões (`teamPermissions.test.js`)
- Limites por plano configurados em `backend/config/plans.js`

---

### 2. Filtros (`add filter`)
**Commit:** `ca171d3`

- Filtros aplicados nas listagens principais do sistema

---

### 3. Thread de Perguntas de Usuários ML (`add users question thread`)
**Commit:** `0ea7928`

- `MeliMessagesController` — endpoint para buscar thread de perguntas por usuário
- `meliMessagesService` — integração com API do Mercado Livre, filtragem de perguntas inválidas do ML
- Frontend `MeliMessagesPage.jsx` — exibição da thread de perguntas por comprador

---

### 4. Ícone de Conteúdo Bloqueado (`blocked content icon`)
**Commit:** `90a0785`

- `AppLayout` atualizado para exibir ícone de bloqueio nos itens de menu sem acesso
- `AuthContext` com lógica de `effectivePlan` e checagem de features por plano
- `DashboardPage` e `PlansPage` ajustados para refletir estado de bloqueio

---

### 5. Lock de Gerenciamento de Planos para Não-Owners (`add lock plans manager users`)
**Commit:** `bb6e416`

- Na `PlansPage`, botões de "Assinar" e "Usar gratuito" são exibidos **apenas para owners**
- Membros não-owners veem banner informativo:
  > _"Somente o administrador da conta pode alterar o plano ou gerenciar a assinatura."_
- Portal de cobrança (Stripe) também oculto para não-owners
- Uso de `isOwner` do `AuthContext` para controle condicional de UI

---

## 🏗️ Arquitetura Relevante

```
backend/
  config/plans.js              ← limites por plano (links, sellers, membros)
  src/
    controllers/
      TeamController.js        ← CRUD de times
      MeliMessagesController.js← perguntas ML por usuário
    middleware/
      auth.js                  ← injeta user + team no req
      plan.js                  ← bloqueia por plano/feature
    models/
      Team.js                  ← membros e roles
      User.js                  ← plano, hasSubscription, teamId
    utils/access.js            ← helper de permissões

frontend/src/
  contexts/AuthContext.jsx     ← isOwner, effectivePlan, teamRole
  pages/
    TeamPage.jsx               ← gerenciamento de membros
    PlansPage.jsx              ← planos + lock para não-owners
    MeliMessagesPage.jsx       ← thread de perguntas ML
  components/
    AppLayout.jsx              ← menu com ícones de bloqueio
    SettingsPlanSection.jsx    ← seção de plano nas configurações
```

---

## 📋 Pendências / Próximos Passos

- [ ] Notificação por e-mail ao convidar membro para o time
- [ ] Página de aceite de convite (link por e-mail)
- [ ] Testes E2E do fluxo de times
- [ ] Paginação na thread de perguntas ML
- [ ] Auditoria de ações do time (log de quem fez o quê)
- [ ] Exibir data de expiração do plano no header/sidebar

---

## 🔑 Variáveis de Ambiente Necessárias

```env
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_STARTER=
STRIPE_PRICE_ID_PRO=
STRIPE_PRICE_ID_ENTERPRISE=

# Mercado Livre
MELI_CLIENT_ID=
MELI_CLIENT_SECRET=

# App
JWT_SECRET=
DATABASE_URL=
```
