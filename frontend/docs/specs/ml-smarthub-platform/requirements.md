# ML SmartHub Frontend — Índice de Specs

## Visão Geral

O frontend do ML SmartHub é uma aplicação React/Vite para vendedores do Mercado Livre. A documentação foi separada por página, componente e infraestrutura de frontend para facilitar manutenção, revisão de escopo e acompanhamento de tarefas.

## Convenção

Cada pasta de spec deve conter:

- `requirements.md`: o que a tela, componente ou serviço deve fazer.
- `design.md`: como foi implementado e quais arquivos participam.
- `tasks.md`: checklist de cobertura atual, pendências e riscos conhecidos.

## Specs Por Área

| Área | Pasta |
|---|---|
| Rotas e proteção de rotas | `frontend/docs/specs/app-routing/` |
| Contextos globais | `frontend/docs/specs/contexts/` |
| Serviço de API | `frontend/docs/specs/api-service/` |
| Layout autenticado | `frontend/docs/specs/app-layout/` |
| Autenticação pública | `frontend/docs/specs/auth-pages/` |
| Dashboard | `frontend/docs/specs/dashboard/` |
| Links | `frontend/docs/specs/links/` |
| Análise de preços | `frontend/docs/specs/price-analyze/` |
| Monitor de sellers | `frontend/docs/specs/seller-monitor/` |
| Catálogo | `frontend/docs/specs/catalog/` |
| Mercado Livre | `frontend/docs/specs/meli/` |
| Analytics ML | `frontend/docs/specs/meli-analytics/` |
| Mensagens ML | `frontend/docs/specs/meli-messages/` |
| Planos e billing | `frontend/docs/specs/plans/` |
| Time e permissões | `frontend/docs/specs/team/` |
| Configurações | `frontend/docs/specs/settings/` |
| Setup de cookies | `frontend/docs/specs/setup-cookies/` |
| Ajuda | `frontend/docs/specs/help/` |
| Páginas públicas | `frontend/docs/specs/public-pages/` |
| Painel admin | `frontend/docs/specs/admin/` |
| Componentes compartilhados | `frontend/docs/specs/shared-components/` |
| Hooks e utilitários | `frontend/docs/specs/hooks-utils/` |

## Lacunas Identificadas

- `ExpedicaoPage.jsx` e `NfePage.jsx` existem em `frontend/src/pages`, mas as rotas `/expedicao` e `/nfe` redirecionam para `/dashboard`.
- O backend também possui controllers de expedição e NF, mas eles não estão montados em `backend/src/routes/index.js`.
- As props e estados internos de componentes grandes ainda não têm testes automatizados de UI.
- O mapa de módulos por plano existe no frontend e no backend; mudanças de plano devem ser revisadas nos dois lados para evitar divergência visual.

## Arquitetura de Domínios (desde 2026-05-30)

| Domínio | Serve | Tecnologia |
|---|---|---|
| `mlsmarthub.com.br` / `www.` | Landing page de marketing | HTML estático (`/var/www/mlsmarthub-landing/`) |
| `app.mlsmarthub.com.br` | React SPA + API | Nginx → dist + proxy `:3333` |

**Landing page local:** `landing/index.html` na raiz do projeto.
**Deploy manual:** `rsync -avz --delete dist/ root@178.104.105.239:/var/www/saas-zecrawler/frontend/dist/`

Ao alterar preços ou funcionalidades descritos na landing, atualizar `landing/index.html` e re-enviar para a VPS.

## Rotina de Manutenção

Ao alterar uma página ou componente, atualize a pasta correspondente nesta árvore. Ao adicionar nova página, crie uma nova pasta com `requirements.md`, `design.md` e `tasks.md`.
