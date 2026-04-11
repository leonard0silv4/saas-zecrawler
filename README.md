# ZeCrawler SaaS

Plataforma SaaS multi-tenant para monitoramento de e-commerce (Mercado Livre).

## Arquitetura

```
zecrawler-saas/
├── backend/                    # Node.js + Express + MongoDB
│   ├── config/
│   │   ├── database.js         # Conexão MongoDB centralizada
│   │   └── plans.js            # Planos e módulos (single source of truth)
│   └── src/
│       ├── controllers/        # 7 controllers
│       ├── middleware/
│       │   ├── auth.js         # JWT + req.user + getOwnerId()
│       │   └── plan.js         # requireModule() + checkLinkLimit()
│       ├── models/             # 8 models (todos com ownerId)
│       ├── routes/index.js     # Rotas organizadas por módulo
│       ├── services/cron.js    # Atualização automática de links
│       └── utils/              # scraper, SSE, meliToken
│
└── frontend/                   # React 18 + Vite + Tailwind
    └── src/
        ├── components/         # AppLayout (sidebar responsiva)
        ├── contexts/           # AuthContext (login, register, canAccess)
        ├── pages/              # 9 páginas
        └── services/api.js     # Axios com interceptors
```

## Setup Rápido

```bash
# 1. Backend
cd backend
cp .env.example .env            # Preencha MongoDB, SECRET, ML keys
npm install
npm run dev                     # http://localhost:3333

# 2. Frontend (outro terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

## Variáveis de Ambiente (.env)

```env
MONGO_USER=seu_user
MONGO_PASSWORD=sua_senha
MONGO_STRING=cluster.mongodb.net/zecrawler-saas
SECRET=jwt_secret_seguro
PORT=3333
ML_CLIENT_ID=
ML_CLIENT_SECRET=
ML_REDIRECT_URI=
FRONTEND_URL=http://localhost:5173
```

## Planos de Assinatura

| Plano      | Preço      | Links  | Módulos                                    |
|------------|------------|--------|--------------------------------------------|
| Gratuito   | R$ 0       | 10     | Links                                      |
| Starter    | R$ 19,90   | 100    | Links, Mercado Livre                       |
| Pro        | R$ 29,90   | 500    | Links, ML, Expedição, NF, Catálogo         |
| Business   | R$ 59,90   | 1.000  | Tudo + API access + Suporte prioritário    |

Configurados em `backend/config/plans.js`.

## API Endpoints

Todas as rotas com prefixo `/api`. Autenticação via `Authorization: Bearer <token>`.

### Auth (público)
```
POST /api/auth/register   { name, email, password }
POST /api/auth/login      { email, password }
GET  /api/plans
```

### Auth (autenticado)
```
GET  /api/auth/me
PUT  /api/auth/plan       { plan: "starter" }
```

### Links (todos os planos)
```
GET    /api/links?page=1&perPage=20&storeName=mercadolivre
POST   /api/links          { link, myPrice, tag }
POST   /api/links/batch    { link: "url_lista", myPrice, tag }
PUT    /api/links/:id      { myPrice, tags }
DELETE /api/links/:id
DELETE /api/links/all/:storeName
GET    /api/links/refresh/:storeName   (SSE)
GET    /api/links/tags
POST   /api/links/clear-rates/:storeName
```

### Expedição (Pro+)
```
GET  /api/expedicao/verificar/:orderId
POST /api/expedicao/registrar    { orderId, mesaId, seller }
GET  /api/expedicao/meta
POST /api/expedicao/meta         { tipoConfiguracao, total|porSeller }
POST /api/expedicao/encerrar-dia
GET  /api/expedicao/dashboard?data=2025-04-09
```

### Notas Fiscais (Pro+)
```
POST /api/nfe/parse   (upload XML)
GET  /api/nfe?search=&startDate=&endDate=&cursor=&limit=20
POST /api/nfe         { fornecedor, numeroNota, valores, produtos }
GET  /api/nfe/:id
PUT  /api/nfe/:id
DELETE /api/nfe/:id
```

### Catálogo (Pro+)
```
GET    /api/catalog?search=&cursor=&limit=50
POST   /api/catalog        { sku1, produto, medidas, largura, comprimento, altura }
PUT    /api/catalog/:id
DELETE /api/catalog/:id
POST   /api/catalog/import  (upload .xlsx)
```

### Mercado Livre (Starter+)
```
GET /api/meli/auth?token=     (redireciona OAuth ML)
GET /api/meli/callback        (callback OAuth)
GET /api/meli/accounts
GET /api/meli/products?user_id=
GET /api/meli/shipment/:shipmentId
```

### Cookies ML
```
GET    /api/cookies
POST   /api/cookies   { cookies: [...] }
DELETE /api/cookies
```

### Stripe Billing
```
POST /api/stripe/checkout    { planSlug: "pro" }       → { url } (redirect to Stripe)
POST /api/stripe/portal                                → { url } (Stripe Customer Portal)
GET  /api/stripe/status                                → subscription details
POST /api/stripe/downgrade                             → cancels at period end
POST /api/stripe/webhook     (raw body, public)        → Stripe events
```

## Stripe — Setup Completo

### 1. Criar produtos no Stripe
```bash
cd backend
STRIPE_SECRET_KEY=sk_test_... node src/scripts/seedStripeProducts.js
```

O script cria 3 produtos (Starter, Pro, Business) com preços mensais em BRL e imprime os `price_*` IDs.

### 2. Configurar .env
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_1Abc...
STRIPE_PRICE_PRO=price_1Def...
STRIPE_PRICE_BUSINESS=price_1Ghi...
```

### 3. Criar webhook no Stripe Dashboard
- URL: `https://seudominio.com/api/stripe/webhook`
- Eventos necessários:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

### 4. Ativar Customer Portal no Stripe Dashboard
- Stripe Dashboard → Settings → Billing → Customer Portal
- Habilitar: trocar plano, cancelar, atualizar cartão, ver faturas

### Fluxo de cobrança

```
Usuário clica "Assinar"
    │
    ▼
POST /api/stripe/checkout { planSlug }
    │
    ├─ Já tem subscription ativa? → Stripe API atualiza o plano (proration)
    │
    └─ Primeira vez? → Cria Checkout Session → Redirect para Stripe
                                                    │
                                                    ▼
                                           Stripe hospeda o pagamento
                                           (cartão, boleto, PIX se habilitado)
                                                    │
                                                    ▼
                                           Webhook: checkout.session.completed
                                                    │
                                                    ▼
                                           syncSubscription() atualiza:
                                           - user.plan
                                           - user.stripeSubscriptionId
                                           - user.planExpiresAt
                                                    │
    ┌───────────────────────────────────────────────┘
    │
    ▼
Renovação mensal automática
    │
    ├─ Sucesso → webhook: customer.subscription.updated → plano continua
    │
    └─ Falha → webhook: invoice.payment_failed → status "past_due"
               middleware plan.js bloqueia módulos pagos

Cancelamento (pelo portal ou /api/stripe/downgrade)
    │
    ▼
cancel_at_period_end = true → usa até fim do período
    │
    ▼
webhook: customer.subscription.deleted → user.plan = "free"
```

## Diferenças do Projeto Original

| Antes                                    | Agora                                          |
|------------------------------------------|-------------------------------------------------|
| `uid` (string solta)                     | `ownerId` (ObjectId tipado + index)             |
| `verifyToken.recoverAuth()` em cada rota | `req.user` via middleware + `getOwnerId(req)`   |
| Sem controle de plano                    | `requireModule()` + `checkLinkLimit()`          |
| 3 models de expedição em 3 arquivos      | 1 arquivo `Expedicao.js` com 3 exports          |
| SSE global                               | SSE por `ownerId` (multi-tenant)                |
| Depende de Python/Pickle                 | Cookies direto no MongoDB                       |
| Rotas sem prefixo                        | Todas em `/api/*`                               |
| Sem frontend                             | React + Vite + Tailwind completo                |

## Deploy na VPS

```bash
# Backend (PM2)
cd backend
npm install --production
pm2 start src/index.js --name zecrawler-api

# Frontend (build estático)
cd frontend
npm run build
# Servir dist/ via Nginx

# Nginx config
server {
    listen 80;
    server_name app.seudominio.com;

    location /api {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    location / {
        root /var/www/zecrawler/frontend/dist;
        try_files $uri /index.html;
    }
}
```
