# Design System "Holo" — Tarefas

- [x] Tokens de cor, fontes e classes globais (`tailwind.config.js`, `globals.css`)
- [x] Primitives `ui/` reescritos + novos (`PageHeader`, `Tabs`, `EmptyState`, `Kpi`, `Select`)
- [x] Efeitos `fx/` e tema de gráficos (`chartTheme`, `NeonTooltip`, `ChartGlowDefs`)
- [x] Shell (`AppLayout`): sidebar de vidro, topbar com status do Mercado Livre
- [x] Dashboard com hero 3D real (React Three Fiber) + fallback 2D
- [x] Analytics ML, Catálogo ML, Links, Análise de concorrência, Monitor sellers
- [x] Mensagens ML (abas de loja, urgência por tempo de espera, sugestões inline, contador 2000, ⌘/Ctrl+Enter)
- [x] Contas, Dimensões e Peso, Configurações, Time, Planos, Ajuda, Onboarding
- [x] Login, Cadastro, Esqueci/Redefinir senha, `/price`, `/about-us`, `/faq`
- [x] `/hub-admin`
- [x] Remoção da camada provisória de cores (`legacy-dark.css` / `LEGACY_DARK`)
- [x] Landing com vídeo no hero e `deploy.sh` copiando `landing/assets/`
- [x] Tema claro opcional com botão no topo (escuro continua padrão)
- [ ] `ExpedicaoPage.jsx` e `NfePage.jsx` (rotas desativadas) ainda usam classes claras antigas
- [ ] Conferir visualmente o painel admin por dentro (exige credenciais do `.env`)
- [x] Code-splitting por rota (`lazyPage` em `App.jsx`) + bibliotecas em chunks próprios (`vite.config.js`): carga inicial caiu de ~385 KB para ~116 KB (gzip)
