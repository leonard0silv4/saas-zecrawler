# PlansPage — Requirements

## Escopo

Planos, checkout e assinatura em `/plans`.

## Preços Atuais (jun/2026)

| Plano    | Preço      | Links | Sellers | Usuários | Times | Contas ML |
|----------|-----------|-------|---------|----------|-------|-----------|
| Gratuito | R$ 0      | 5     | 1       | 1        | 1     | —         |
| Starter  | R$ 99,90  | 30    | 5       | 2        | 1     | 1         |
| Pro      | R$ 139,90 | 50    | 10      | 6        | 3     | 3         |
| Business | R$ 199,90 | 200   | 20      | 20       | 10    | 10        |

Módulo `meliAnalytics` disponível a partir do plano **Pro** (era exclusivo Business).

## Requisitos

- Deve listar planos com `GET /plans`.
- Deve consultar assinatura com `GET /stripe/status`.
- Deve iniciar checkout com `POST /stripe/checkout`.
- Deve abrir portal com `POST /stripe/portal`.
- Deve permitir downgrade com `POST /stripe/downgrade` quando aplicável.
- Deve reagir a callbacks do Stripe na URL.
- `PublicPricingPage` exibe tabela com "Contas Mercado Livre" mostrando os limites numéricos por plano.
- `moduleMap` em `AuthContext` deve refletir `meliAnalytics: ["pro", "business"]`.
