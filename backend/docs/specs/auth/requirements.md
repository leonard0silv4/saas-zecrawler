# Requisitos — Módulo de Autenticação

## Visão Geral

Gerencia o ciclo de vida de contas de usuário: registro, login, recuperação de senha, perfil e encerramento de conta. Utiliza JWT para autenticação stateless e bcrypt para hash de senhas.

---

## Requisitos Funcionais

### RF-01 Registro de Conta
- O sistema deve aceitar `name`, `email` e `password` para criar uma nova conta.
- O email deve ser único (case-insensitive, trimmed).
- A senha deve ser armazenada como hash bcrypt (salt rounds = 10).
- A conta criada recebe `role = "owner"` e `plan = "free"` por padrão.
- O sistema retorna um JWT válido por 30 dias e os dados sanitizados do usuário.

### RF-02 Login
- O sistema deve autenticar com `email` e `password`.
- Credenciais inválidas retornam HTTP 401 sem indicar qual campo está errado.
- Em caso de sucesso, retorna JWT + dados do usuário com `effectivePlan`, `allowedModules` e `planConfig`.

### RF-03 Perfil Autenticado (`/auth/me`)
- Retorna os dados atualizados do usuário autenticado.
- Inclui `effectivePlan`, `allowedModules`, `planModules`, `planConfig` e `hasSubscription`.
- Campos sensíveis (`password`, `resetToken`, `stripeCustomerId`, etc.) são omitidos da resposta.

### RF-04 Recuperação de Senha
- O usuário informa o email; o sistema gera um token aleatório (32 bytes hex), armazena o hash SHA-256 no banco e envia o token plain por email.
- O token expira em 1 hora.
- Se o email não existir, retorna HTTP 404 com `error: "email_not_found"`.
- O reset aceita `token` + `newPassword` (mínimo 6 caracteres), valida o hash e atualiza a senha.
- Após o reset, `resetToken` e `resetTokenExpiresAt` são zerados.

### RF-05 Encerramento de Conta
- Exclusivo para `role = "owner"`.
- Cancela a assinatura Stripe imediatamente (se existir) e remove o customer Stripe.
- Remove em cascata todos os dados do owner: SellerPages → SellerProducts + SellerAlerts, MeliQuestions, MeliProducts, MeliMessageTemplates, Contas ML, Links, Cookies, CatalogProducts, NFs, PriceAnalyzeSnapshots, ExpedicaoRegistros, ExpedicaoMetas, ExpedicaoDiasEncerrados, sub-usuários, times e por último o próprio owner.

### RF-06 Atualização de Plano (downgrade manual)
- Permite apenas downgrade para `"free"` via este endpoint.
- Upgrades para planos pagos devem usar `/stripe/checkout`.

---

## Requisitos Não-Funcionais

- JWT assinado com `SECRET` do `.env`, expiração de 30 dias.
- `lastAccessAt` do usuário é atualizado de forma não-bloqueante, no máximo uma vez a cada 30 minutos.
- Respostas nunca expõem `password`, `resetToken`, `resetTokenExpiresAt`, `stripeCustomerId`, `stripeSubscriptionId`, `stripeSubscriptionStatus` ou `__v`.

---

## Propriedades de Correção

- **P1**: Para qualquer registro bem-sucedido, `User.findOne({ email })` deve retornar exatamente um documento.
- **P2**: O token JWT retornado no login deve ser verificável com `jwt.verify(token, SECRET)` e conter `userId` igual ao `_id` do usuário.
- **P3**: Após `resetPassword` bem-sucedido, `user.resetToken` deve ser `null` e `user.resetTokenExpiresAt` deve ser `null`.
- **P4**: Após `deleteAccount`, nenhum documento com `ownerId = deletedId` deve existir em nenhuma collection.
- **P5**: Um token de reset expirado (> 1h) deve retornar HTTP 400.
