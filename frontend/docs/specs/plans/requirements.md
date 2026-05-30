# PlansPage — Requirements

## Escopo

Planos, checkout e assinatura em `/plans`.

## Requisitos

- Deve listar planos com `GET /plans`.
- Deve consultar assinatura com `GET /stripe/status`.
- Deve iniciar checkout com `POST /stripe/checkout`.
- Deve abrir portal com `POST /stripe/portal`.
- Deve permitir downgrade com `POST /stripe/downgrade` quando aplicável.
- Deve reagir a callbacks do Stripe na URL.
