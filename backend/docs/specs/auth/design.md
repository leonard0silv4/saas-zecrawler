# Design — Módulo de Autenticação

## Arquitetura

```
POST /auth/register  →  AuthController.register
POST /auth/login     →  AuthController.login
GET  /auth/me        →  authenticate → AuthController.me
PUT  /auth/plan      →  authenticate → AuthController.updatePlan
POST /auth/forgot-password  →  AuthController.forgotPassword
POST /auth/reset-password   →  AuthController.resetPassword
DELETE /auth/account →  authenticate → requireOwner → AuthController.deleteAccount
```

## Modelo de Dados — User

| Campo | Tipo | Descrição |
|---|---|---|
| `email` | String (unique, lowercase) | Identificador de login |
| `password` | String (bcrypt) | Hash da senha |
| `name` | String | Nome do usuário |
| `role` | enum: owner/admin/member | Papel na conta |
| `ownerId` | ObjectId ref User | null para owners; aponta para o owner para membros |
| `plan` | enum: free/starter/pro/business | Plano atual |
| `planExpiresAt` | Date | Expiração manual (fallback sem Stripe) |
| `stripeCustomerId` | String | ID do customer no Stripe |
| `stripeSubscriptionId` | String | ID da subscription ativa |
| `stripeSubscriptionStatus` | String | active, trialing, past_due, canceled… |
| `permissions` | [String] | Permissões granulares para membros |
| `teamIds` | [ObjectId ref Team] | Times aos quais o membro pertence |
| `mySellerNames` | [String] | Nomes dos próprios sellers (para análise de preços) |
| `resetToken` | String | Hash SHA-256 do token de reset |
| `resetTokenExpiresAt` | Date | Expiração do token de reset |
| `lastAccessAt` | Date | Último acesso (atualizado a cada 30min) |

**Virtual `isPlanActive`**: `true` se `plan === "free"`, ou se a subscription Stripe está `active`/`trialing`, ou se `planExpiresAt > now`.

## Fluxo de Autenticação

```
Cliente → POST /auth/login
  → bcrypt.compare(password, user.password)
  → loadOwnerDoc(user)          // carrega owner se for membro
  → loadTeamPermissions(user)   // carrega permissões dos times
  → computeAccess(user, owner, teamPerms)
  → sanitizeUser(user, ownerDoc)
  → { token, user: sanitized }
```

## Fluxo de Recuperação de Senha

```
POST /auth/forgot-password { email }
  → User.findOne({ email })
  → crypto.randomBytes(32) → tokenPlain
  → SHA-256(tokenPlain) → tokenHash
  → user.resetToken = tokenHash, resetTokenExpiresAt = now + 1h
  → sendPasswordResetEmail(email, tokenPlain)

POST /auth/reset-password { token, newPassword }
  → SHA-256(token) → tokenHash
  → User.findOne({ resetToken: tokenHash, resetTokenExpiresAt: { $gt: now } })
  → bcrypt.hash(newPassword, 10)
  → user.password = hash, resetToken = null, resetTokenExpiresAt = null
```

## Função `sanitizeUser`

Remove campos sensíveis e enriquece a resposta com:
- `effectivePlan` — plano efetivo (do owner, não do membro)
- `allowedModules` — módulos acessíveis
- `planModules` — todos os módulos do plano
- `planConfig` — configuração completa do plano (limites, preço, etc.)
- `hasSubscription` — boolean indicando se há subscription Stripe ativa

## Middleware `authenticate`

1. Extrai Bearer token do header `Authorization`.
2. Verifica com `jwt.verify(token, SECRET)`.
3. Carrega o usuário do banco.
4. Resolve `ownerId` (próprio ID para owners, `user.ownerId` para membros).
5. Carrega permissões de times via `loadTeamPermissions`.
6. Calcula `effectivePlan` e `allowedModules` via `computeAccess`.
7. Atualiza `lastAccessAt` de forma não-bloqueante (throttle 30min).
8. Popula `req.user` com os dados necessários para os controllers.
