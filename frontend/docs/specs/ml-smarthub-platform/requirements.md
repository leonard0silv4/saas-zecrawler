# Documento de Requisitos — ML SmartHub (Frontend)

## Introdução

O ML SmartHub é uma plataforma SaaS para vendedores do Mercado Livre. Este documento descreve os requisitos do frontend organizados por página e componente, refletindo o comportamento real implementado no código.

---

## Glossário

- **Owner**: Usuário com `role === "owner"`. Acesso total, incluindo planos, time e configurações sensíveis.
- **Member**: Usuário criado pelo Owner com permissões restritas por módulo.
- **Plan**: Nível de assinatura (free, starter, pro, business) que determina módulos e limites.
- **Module**: Funcionalidade controlada por plano e permissão (links, priceAnalyze, catalog, meli, meliMessages, meliAnalytics, sellerMonitor).
- **JWT**: Token de autenticação armazenado em `localStorage`.
- **effectivePlan**: Plano efetivo do usuário, podendo ser `effectivePlan` ou `plan` do objeto user.
- **planConfig**: Objeto com limites do plano (maxLinks, maxSellerMonitors, maxTeamUsers, maxTeams, name).
- **planModules**: Array de módulos disponíveis no plano atual.
- **allowedModules**: Array de módulos permitidos para o usuário (Members).
- **CookieML**: JSON de cookies de sessão do Mercado Livre para scraping autenticado.
- **PesoCubico**: (L × C × A) / 6000 para produtos; (L × C × A) / 5900 para caixas.

---

## 1. Contextos Globais

### 1.1 `AuthContext` (`src/contexts/AuthContext.jsx`)

**Responsabilidade**: Gerenciar autenticação, sessão e controle de acesso em toda a aplicação.

#### Estado
- `user`: objeto do usuário autenticado ou `null`
- `loading`: boolean indicando carregamento inicial da sessão

#### Comportamento de inicialização
- WHEN a aplicação carrega, THE AuthContext SHALL verificar `localStorage` por `token` e `user`
- IF token e user existem no localStorage, THE AuthContext SHALL restaurar o user do cache e disparar `GET /auth/me` para validar e atualizar os dados
- IF `GET /auth/me` retornar erro, THE AuthContext SHALL chamar `logout()` automaticamente
- THE AuthContext SHALL definir `loading = false` após a verificação inicial, independente do resultado

#### Funções expostas
- `login(email, password)`: POST `/auth/login`, armazena token e user no localStorage, atualiza estado
- `register(name, email, password)`: POST `/auth/register`, armazena token e user, atualiza estado
- `logout()`: remove token e user do localStorage, seta `user = null`
- `refreshUser()`: GET `/auth/me`, atualiza user no estado e localStorage; chama logout em caso de erro
- `manageBilling()`: POST `/stripe/portal`, redireciona para URL retornada
- `deleteAccount()`: DELETE `/auth/account`, limpa localStorage e seta `user = null`
- `canAccess(module)`: retorna `true` se o módulo está em `user.allowedModules` (array) OU se o plano efetivo inclui o módulo no mapa estático
- `isBlockedByPlan(module)`: retorna `true` se o módulo não está disponível no plano atual (independente de permissões de Member)
- `isOwner`: computed — `user?.role === "owner"`

#### Mapa de módulos por plano (hardcoded no frontend)
| Módulo | free | starter | pro | business |
|---|---|---|---|---|
| links | ✓ | ✓ | ✓ | ✓ |
| priceAnalyze | ✓ | ✓ | ✓ | ✓ |
| sellerMonitor | ✓ | ✓ | ✓ | ✓ |
| meli | — | ✓ | ✓ | ✓ |
| catalog | — | — | ✓ | ✓ |
| meliMessages | — | — | — | ✓ |
| meliAnalytics | — | — | — | ✓ |

---

### 1.2 `NotificationContext` (`src/contexts/NotificationContext.jsx`)

**Responsabilidade**: Gerenciar badges de mensagens não lidas e status de cookies ML.

#### Estado
- `unreadCounts`: objeto `{ [userId]: number }` com contagem de perguntas não respondidas por conta ML
- `hasCookies`: boolean indicando se o Owner tem CookieML configurado (default `true` para evitar flash)

#### Comportamento
- WHEN o usuário está autenticado, THE NotificationContext SHALL chamar `GET /meli/messages/unread-count` e `GET /cookies/status` na montagem
- THE NotificationContext SHALL fazer polling de `GET /meli/messages/unread-count` a cada **90 segundos**, apenas quando `document.hidden === false`
- WHEN o usuário faz logout (`user = null`), THE NotificationContext SHALL resetar `unreadCounts` para `{}` e `hasCookies` para `true`

#### Funções expostas
- `hasDotForUserId(userId)`: retorna `true` se `unreadCounts[userId] > 0`
- `hasAnyDot`: `true` se qualquer conta tem mensagens não lidas
- `fetchUnread()`: força atualização imediata da contagem
- `refreshCookieStatus()`: força atualização do status de cookies

---

## 2. Serviço de API (`src/services/api.js`)

- THE api service SHALL usar `VITE_API_URL/api` como baseURL em produção, ou `/api` em desenvolvimento (proxy Vite)
- THE api service SHALL injetar `Authorization: Bearer {token}` em todas as requisições via interceptor de request
- WHEN uma resposta retornar HTTP 401, THE api service SHALL remover token e user do localStorage e redirecionar para `/login`

---

## 3. Proteção de Rotas (`src/App.jsx`)

### 3.1 `ProtectedRoute`
- WHEN `loading === true`, THE ProtectedRoute SHALL exibir spinner centralizado
- WHEN `user === null` e `loading === false`, THE ProtectedRoute SHALL redirecionar para `/login`

### 3.2 `PublicRoute`
- WHEN `loading === true`, THE PublicRoute SHALL retornar `null` (sem render)
- WHEN `user !== null`, THE PublicRoute SHALL redirecionar para `/dashboard`

### 3.3 `ModuleRoute`
- WHEN `loading === true`, THE ModuleRoute SHALL retornar `null`
- WHEN `canAccess(module) === false`, THE ModuleRoute SHALL redirecionar para `/plans`

### 3.4 `OwnerRoute`
- WHEN `loading === true`, THE OwnerRoute SHALL retornar `null`
- WHEN `isOwner === false`, THE OwnerRoute SHALL redirecionar para `/dashboard`

### 3.5 Mapa de rotas
| Rota | Proteção | Componente |
|---|---|---|
| `/` | — | Redireciona para `/login` |
| `/hub-admin` | — | AdminPage |
| `/login` | PublicRoute | LoginPage |
| `/register` | PublicRoute | RegisterPage |
| `/price` | — | PublicPricingPage |
| `/about-us` | — | AboutPage |
| `/faq` | — | FaqPage |
| `/forgot-password` | — | ForgotPasswordPage |
| `/reset-password` | — | ResetPasswordPage |
| `/dashboard` | ProtectedRoute | DashboardPage |
| `/ajuda` | ProtectedRoute | HelpPage |
| `/plans` | ProtectedRoute | PlansPage |
| `/links` | ProtectedRoute | LinksPage |
| `/price-analyze` | ProtectedRoute | PriceAnalyzePage |
| `/seller-monitor` | ProtectedRoute | SellerMonitorPage |
| `/catalog` | ProtectedRoute | CatalogPage |
| `/meli` | ProtectedRoute | MeliPage |
| `/meli/messages` | ProtectedRoute + ModuleRoute(meliMessages) | MeliMessagesPage |
| `/meli/analytics` | ProtectedRoute + ModuleRoute(meliAnalytics) | MeliAnalyticsPage |
| `/ml-cookies` | ProtectedRoute | MlCookiesPage |
| `/settings` | ProtectedRoute | SettingsPage |
| `/team` | ProtectedRoute + OwnerRoute | TeamPage |
| `/setup-cookies` | ProtectedRoute | SetupCookiesPage |
| `*` | — | Redireciona para `/dashboard` |

---

## 4. Layout Principal (`src/components/AppLayout.jsx`)

**Responsabilidade**: Shell da aplicação autenticada — sidebar, topbar mobile, banner de cookies e outlet de conteúdo.

### 4.1 Sidebar
- THE AppLayout SHALL exibir sidebar fixa (desktop) com logo, navegação, e seção de usuário
- THE AppLayout SHALL ocultar itens com `ownerOnly: true` quando `isOwner === false`
- WHEN um item de navegação tem módulo bloqueado por plano (`isBlockedByPlan`), THE AppLayout SHALL exibir ícone de cadeado dourado e redirecionar para `/plans` ao clicar
- WHEN um item de navegação tem módulo bloqueado por permissão (não por plano), THE AppLayout SHALL exibir ícone de cadeado cinza e chamar `e.preventDefault()` ao clicar
- WHEN `hasAnyDot === true` e o item é "Mensagens ML" e o módulo não está bloqueado, THE AppLayout SHALL exibir badge vermelho (ponto) no item
- THE AppLayout SHALL destacar o item ativo com `bg-brand-50 text-brand-700` baseado em `location.pathname`

### 4.2 Seção de usuário (rodapé da sidebar)
- THE AppLayout SHALL exibir avatar com inicial do nome, nome completo e badge colorido do plano
- WHEN `user.hasSubscription === true` e `isOwner === true`, THE AppLayout SHALL exibir botão "Assinatura" que chama `manageBilling()`
- THE AppLayout SHALL exibir link para `/ajuda` e botão de logout

### 4.3 Topbar mobile
- THE AppLayout SHALL exibir topbar apenas em telas menores que `lg` com botão de menu hambúrguer e logo
- WHEN o botão de menu é clicado, THE AppLayout SHALL abrir a sidebar como painel deslizante com overlay escuro
- WHEN o overlay é clicado, THE AppLayout SHALL fechar a sidebar

### 4.4 Banner de cookies
- WHEN `isOwner === true` e `hasCookies === false`, THE AppLayout SHALL exibir banner vermelho no topo do conteúdo com link para `/setup-cookies`

### 4.5 Onboarding
- THE AppLayout SHALL renderizar `<OnboardingModal />` que exibe modal na primeira visita do usuário

---

## 5. Páginas de Autenticação

### 5.1 `LoginPage` (`/login`)
- THE LoginPage SHALL exibir formulário com campos email e senha
- WHEN o formulário é submetido com credenciais válidas, THE LoginPage SHALL chamar `login()` e redirecionar para `/dashboard`
- WHEN `login()` retorna erro, THE LoginPage SHALL exibir a mensagem de erro retornada pela API
- THE LoginPage SHALL exibir links para `/forgot-password` e `/register`
- THE LoginPage SHALL desabilitar o botão de submit durante o carregamento

### 5.2 `RegisterPage` (`/register`)
- THE RegisterPage SHALL exibir formulário com campos nome, email e senha (mínimo 6 caracteres)
- WHEN a senha tem menos de 6 caracteres, THE RegisterPage SHALL exibir erro sem chamar a API
- WHEN o formulário é submetido com dados válidos, THE RegisterPage SHALL chamar `register()` e redirecionar para `/dashboard`
- WHEN `register()` retorna erro, THE RegisterPage SHALL exibir a mensagem de erro retornada pela API
- THE RegisterPage SHALL exibir link para `/login`

### 5.3 `ForgotPasswordPage` e `ResetPasswordPage`
- THE ForgotPasswordPage SHALL exibir formulário de email para solicitar redefinição de senha via POST `/auth/forgot-password`
- THE ResetPasswordPage SHALL exibir formulário de nova senha, lendo o token da query string, via POST `/auth/reset-password`

---

## 6. `DashboardPage` (`/dashboard`)

- THE DashboardPage SHALL exibir saudação com o primeiro nome do usuário
- THE DashboardPage SHALL exibir o nome do plano (`user.planConfig.name`) e os limites de links e sellers monitorados
- THE DashboardPage SHALL renderizar 6 cards de módulos: Links, Análise de Preços, Monitor Sellers, Dimensões e Peso, Mercado Livre, Analytics ML
- WHEN `canAccess(module) === false` para um card, THE DashboardPage SHALL exibir o card com `opacity-60` e `cursor-default`
- WHEN o módulo está bloqueado por plano (`isBlockedByPlan`), THE DashboardPage SHALL exibir cadeado dourado e redirecionar para `/plans` ao clicar
- WHEN o módulo está bloqueado por permissão (não por plano), THE DashboardPage SHALL exibir cadeado cinza e chamar `e.preventDefault()` ao clicar

---

## 7. `LinksPage` (`/links`)

### 7.1 Cabeçalho e controles
- THE LinksPage SHALL exibir título, contagem de links utilizados (`total de maxLinks`) e barra de progresso proporcional
- THE LinksPage SHALL exibir botões "Atualizar" e "Adicionar"
- WHEN "Atualizar" é clicado, THE LinksPage SHALL chamar `GET /api/links/refresh/{storeName}` via Fetch API com streaming, exibindo spinner no botão durante o processo
- WHEN "Adicionar" é clicado, THE LinksPage SHALL abrir modal de criação de link

### 7.2 Seção de Inteligência de Receita (`AISection`)
- THE LinksPage SHALL exibir a seção de IA quando `aiData.totalCount > 0`
- THE AISection SHALL exibir 4 cards: SKUs Perdendo (com % do total), Ticket Médio, seletor de Cenário e slider de SKUs para ganhar
- THE AISection SHALL calcular projeções para 10, 15 e 20 dias usando a fórmula: `winableSkus × salesPerSku × (days/7) × medianPrice`
  - Cenário Conservador: `salesPerSku = 0.25`
  - Cenário Moderado: `salesPerSku = 0.5`
- THE AISection SHALL exibir barras de progresso relativas ao valor máximo (20 dias) para cada projeção
- WHEN o ícone de ajuda é clicado, THE AISection SHALL abrir modal explicativo via `createPortal` com detalhes da metodologia

### 7.3 Filtros
- THE LinksPage SHALL exibir barra de filtros com: busca por título (debounce 400ms), busca por SKU (debounce 400ms), filtro de status (Todos/Ganhando/Perdendo), filtro de tag (select dinâmico), filtro de vendedor (select dinâmico)
- WHEN qualquer filtro é alterado, THE LinksPage SHALL resetar a paginação para página 1
- THE LinksPage SHALL exibir botão "Limpar" quando há filtros ativos
- THE LinksPage SHALL carregar tags disponíveis via `GET /links/tags` e sellers via `GET /links/sellers` na montagem

### 7.4 Tabela de links
- THE LinksPage SHALL exibir tabela com colunas ordenáveis (clique alterna asc/desc): produto, preço concorrente, meu preço, status, tags, atualizado
- THE LinksPage SHALL calcular status de cada link:
  - `nowPrice > myPrice` → "Ganhando" (verde)
  - `nowPrice < myPrice` → "Perdendo" (vermelho)
  - sem myPrice ou preços iguais → "Neutro" (cinza)
- THE LinksPage SHALL exibir menu dropdown por linha (MoreVertical) com opções Editar e Remover
- THE LinksPage SHALL fechar o menu dropdown ao clicar fora (via `mousedown` listener)
- THE LinksPage SHALL suportar paginação com 20 itens por página

### 7.5 Modal de adição
- THE LinksPage SHALL exibir modal com campos: URL (obrigatório, type=url), Meu Preço (opcional, number), Tag (opcional, text)
- WHEN o formulário é submetido, THE LinksPage SHALL chamar `POST /links` e recarregar a lista e os dados de IA

### 7.6 Modal de edição
- THE LinksPage SHALL exibir modal com campos: Meu Preço (number) e Tags (texto separado por vírgula)
- WHEN salvo, THE LinksPage SHALL chamar `PUT /links/{id}` e atualizar o item na lista local sem recarregar tudo

### 7.7 Exclusão
- WHEN "Remover" é clicado, THE LinksPage SHALL abrir `ConfirmDialog` com mensagem de confirmação
- WHEN confirmado, THE LinksPage SHALL chamar `DELETE /links/{id}` e recarregar a lista e os dados de IA

---

## 8. `PriceAnalyzePage` (`/price-analyze`)

### 8.1 Carregamento inicial
- THE PriceAnalyzePage SHALL carregar `GET /settings` para obter `mySellerNames` e usar como lista de lojas próprias
- THE PriceAnalyzePage SHALL carregar `GET /price-analyze/xml` via Fetch nativo (não axios) para evitar interceptor de 404
- WHEN o XML retorna 404, THE PriceAnalyzePage SHALL exibir estado "sem dados ainda" com instruções passo a passo
- WHEN o XML é carregado com sucesso, THE PriceAnalyzePage SHALL parsear via `parseXML()` e exibir a tabela de grupos

### 8.2 Geração de XML
- WHEN "Buscar dados" é clicado, THE PriceAnalyzePage SHALL chamar `POST /price-analyze/generate` com `{ limit: 300 }` e timeout de 15 minutos
- WHEN `data.urlsProcessadas > 0` e `data.linhasProduto === 0`, THE PriceAnalyzePage SHALL exibir alerta de cookies inválidos com link para `/setup-cookies`
- WHEN a geração conclui, THE PriceAnalyzePage SHALL recarregar o XML automaticamente

### 8.3 Filtros
- THE PriceAnalyzePage SHALL exibir filtros: "Com alerta", "Concorrente na frente", "Sem concorrentes" (toggles) e filtro por vendedor (botões)
- THE PriceAnalyzePage SHALL exibir ponto verde nos botões de vendedor que correspondem às lojas próprias (`storesForBadge`)
- THE PriceAnalyzePage SHALL exibir contagem de grupos filtrados vs total

### 8.4 Tabela de grupos
- THE PriceAnalyzePage SHALL exibir tabela com colunas: Produto, Melhor preço, Vendedor, Ação
- THE PriceAnalyzePage SHALL exibir badges "Sem concorrentes" e "Alerta" nos grupos correspondentes
- THE PriceAnalyzePage SHALL exibir recomendação textual abaixo do nome do produto quando `g.recommendation` existe
- WHEN "Detalhes" é clicado, THE PriceAnalyzePage SHALL abrir modal via `createPortal` com todos os vendedores do grupo ordenados por preço crescente, destacando lojas próprias com fundo verde

### 8.5 Estados especiais
- THE PriceAnalyzePage SHALL exibir spinner de carregamento inicial quando não há dados ainda
- THE PriceAnalyzePage SHALL exibir erros em banner vermelho
- THE PriceAnalyzePage SHALL exibir data/hora da última extração quando disponível

---

## 9. `SellerMonitorPage` (`/seller-monitor`)

### 9.1 Layout
- THE SellerMonitorPage SHALL exibir layout de duas colunas: sidebar de sellers (esquerda, 288px) e painel de detalhes (direita)
- THE SellerMonitorPage SHALL exibir contagem de sellers utilizados vs limite do plano na sidebar

### 9.2 Lista de sellers
- THE SellerMonitorPage SHALL exibir cada seller com: nome, URL, contagem de produtos, tempo desde última execução e indicador de scraping em andamento
- THE SellerMonitorPage SHALL exibir badge vermelho com total de alertas não lidos no cabeçalho da sidebar
- THE SellerMonitorPage SHALL exibir botões de ação por seller: Play (iniciar scraping), Editar, Excluir
- WHEN um seller é selecionado, THE SellerMonitorPage SHALL carregar produtos e alertas daquele seller

### 9.3 Polling automático
- THE SellerMonitorPage SHALL fazer polling de `GET /seller-monitor` a cada **4 segundos** quando há algum seller com `scraping: true`
- THE SellerMonitorPage SHALL fazer polling a cada **30 segundos** quando nenhum seller está em scraping
- WHEN o scraping de um seller conclui (transição `scraping: true → false`) e esse seller está selecionado, THE SellerMonitorPage SHALL recarregar produtos e alertas automaticamente

### 9.4 Painel de detalhes
- THE SellerMonitorPage SHALL exibir abas "Produtos" e "Alertas" no painel de detalhes
- THE SellerMonitorPage SHALL exibir cada produto com: imagem, nome (link), preço atual e badges "Novo" / "Preço alterado"
- THE SellerMonitorPage SHALL exibir cada alerta com: data, tipo ("Produto novo" / "Mudança de preço"), nome do produto (link) e variação de preço para alertas de mudança
- THE SellerMonitorPage SHALL exibir botão "Marcar todos lidos" na aba de alertas quando há alertas não lidos
- WHEN "Marcar lido" é clicado em um alerta, THE SellerMonitorPage SHALL chamar `PUT /seller-monitor/alerts/{id}/read` e atualizar localmente

### 9.5 Adicionar seller
- WHEN o limite do plano é atingido, THE SellerMonitorPage SHALL desabilitar o botão "Novo seller" e exibir mensagem informativa
- THE SellerMonitorPage SHALL exibir modal com campos URL (obrigatório) e Nome (opcional)

### 9.6 Editar seller
- THE SellerMonitorPage SHALL exibir modal com campos Nome e URL
- WHEN a URL é alterada, THE SellerMonitorPage SHALL exibir aviso de que produtos e alertas serão apagados
- WHEN salvo com URL alterada, THE SellerMonitorPage SHALL limpar produtos e alertas locais e recarregá-los

### 9.7 Excluir seller
- WHEN "Excluir" é clicado, THE SellerMonitorPage SHALL abrir `ConfirmDialog` com mensagem de confirmação
- WHEN confirmado, THE SellerMonitorPage SHALL chamar `DELETE /seller-monitor/{id}` e remover da lista local

---

## 10. `CatalogPage` (`/catalog`)

### 10.1 Lista de produtos
- THE CatalogPage SHALL exibir tabela com colunas: SKU-1, Produto, L×C×A, Peso Cúbico e ações
- THE CatalogPage SHALL suportar busca por SKU ou nome com paginação por cursor (30 itens por página)
- THE CatalogPage SHALL exibir botão "Carregar mais" quando `hasMore === true`
- WHEN a busca é alterada, THE CatalogPage SHALL resetar o cursor e recarregar a lista

### 10.2 Adicionar/Editar produto
- THE CatalogPage SHALL exibir modal com campos: SKU-1 (obrigatório), SKU-2, SKU-3, Produto (obrigatório), Medidas (obrigatório), Largura, Comprimento, Altura (obrigatórios), Peso (opcional)
- WHEN o formulário é salvo, THE CatalogPage SHALL calcular `pesoCubico = (L × C × A) / 6000` e enviar no payload
- WHEN campos obrigatórios estão vazios ou dimensões são inválidas, THE CatalogPage SHALL exibir toast de aviso sem chamar a API

### 10.3 Importação XLSX
- THE CatalogPage SHALL exibir input de arquivo oculto acionado por label "Importar XLSX"
- WHEN um arquivo é selecionado, THE CatalogPage SHALL enviar via `POST /catalog/import` com FormData
- WHEN a importação conclui, THE CatalogPage SHALL exibir toast com resumo: `{imported} novos, {skipped} ignorados de {total} linhas`
- WHEN a importação falha, THE CatalogPage SHALL exibir toast de erro mencionando as colunas obrigatórias

### 10.4 Verificador de pacote
- THE CatalogPage SHALL exibir botão "Adicionar ao pacote" (PackagePlus) em cada linha da tabela
- WHEN produtos são adicionados ao pacote, THE CatalogPage SHALL exibir botões "Verificar pacote (N)" e "Limpar pacote" no cabeçalho
- THE CatalogPage SHALL exibir modal de verificação com lista de produtos, campos de dimensões da caixa (L, C, A, Peso) e botão "Conferir pacote"
- WHEN "Conferir pacote" é clicado, THE CatalogPage SHALL calcular:
  - `cubadoCaixa = (L × C × A) / 5900`
  - `cubadoLimiteTotal = soma(pesoCubico × qty)` para cada item
  - `pesoEsperado = soma(peso × qty)` para cada item
  - `pesoDivergente = |pesoInformado - pesoEsperado| / pesoEsperado > 5%`
- WHEN `cubadoCaixa <= cubadoLimiteTotal`, THE CatalogPage SHALL exibir resultado "APROVADO" (verde)
- WHEN `cubadoCaixa > cubadoLimiteTotal`, THE CatalogPage SHALL exibir resultado "REPROVADO" (vermelho)
- WHEN `pesoDivergente === true`, THE CatalogPage SHALL exibir badge "PESO DIVERGENTE" no resultado

### 10.5 Exclusão
- WHEN "Excluir" é clicado, THE CatalogPage SHALL abrir `ConfirmDialog` e chamar `DELETE /catalog/{id}` quando confirmado

---

## 11. `MeliPage` (`/meli`)

### 11.1 Contas conectadas
- THE MeliPage SHALL exibir lista de contas conectadas com nickname e ID do usuário ML
- WHEN `isOwner === true`, THE MeliPage SHALL exibir botão "Conectar nova conta" que redireciona para `/api/meli/auth?token={jwt}`
- WHEN `isOwner === true`, THE MeliPage SHALL exibir botão "Desconectar" por conta
- WHEN uma conta tem `authError === true`, THE MeliPage SHALL exibir banner de autorização expirada com botão "Reconectar" (visível apenas para Owner)
- WHEN "Desconectar" é clicado, THE MeliPage SHALL abrir `ConfirmDialog` descrevendo os dados que serão apagados
- WHEN confirmado, THE MeliPage SHALL chamar `DELETE /meli/accounts/{userId}` e recarregar a lista

### 11.2 Produtos
- THE MeliPage SHALL exibir seção de produtos com select de conta e botão "Listar"
- WHEN "Listar" é clicado, THE MeliPage SHALL chamar `GET /meli/products?user_id={id}` e exibir até 50 produtos com título e link externo
- WHEN há mais de 50 produtos, THE MeliPage SHALL exibir mensagem "Mostrando 50 de {total}"

### 11.3 Consulta de envio (oculta)
- THE MeliPage contém seção de consulta de envio com `className="hidden"` — não visível ao usuário

---

## 12. `MeliAnalyticsPage` (`/meli/analytics`)

### 12.1 Cabeçalho e controles
- THE MeliAnalyticsPage SHALL exibir seletor de conta ML (`AccountSelect`) e seletor de período (7d, 15d, 30d, 90d)
- THE MeliAnalyticsPage SHALL exibir botão "Sincronizar" que chama `POST /meli/analytics/sync?user_id={id}`
- THE MeliAnalyticsPage SHALL exibir botão "Re-sync 90d" que chama `POST /meli/analytics/sync?user_id={id}&force=true`
- WHEN a conta ou período é alterado, THE MeliAnalyticsPage SHALL invalidar o cache de todas as abas e recarregar summary e chart

### 12.2 KPI Cards
- THE MeliAnalyticsPage SHALL exibir 4 cards: Faturamento, Liquidez Marketplace (com taxa ML), Pedidos, Ticket Médio
- THE MeliAnalyticsPage SHALL exibir "…" nos valores enquanto `loadingSummary === true`

### 12.3 Gráfico
- THE MeliAnalyticsPage SHALL exibir gráfico composto (ComposedChart) com área de receita (eixo Y esquerdo) e barras de pedidos (eixo Y direito)
- THE MeliAnalyticsPage SHALL exibir linha de referência tracejada na média de receita do período
- THE MeliAnalyticsPage SHALL exibir tooltip customizado com data formatada, receita em BRL e contagem de pedidos
- THE MeliAnalyticsPage SHALL exibir badge com contagem de dias com vendas no período

### 12.4 Sistema de abas com cache
- THE MeliAnalyticsPage SHALL exibir 3 abas: Estoque, Top Produtos, Pedidos
- THE MeliAnalyticsPage SHALL usar `tabLoadedRef` para evitar re-fetch ao voltar para uma aba já carregada no mesmo contexto (conta + período)
- WHEN a aba é trocada, THE MeliAnalyticsPage SHALL fazer scroll suave para a seção de abas via `tabSectionRef`

### 12.5 Aba Estoque
- THE MeliAnalyticsPage SHALL exibir filtros de tipo (Todos, Full, Normal, Ruptura) e ordenação (Mais vendidos, Velocidade, Estoque, Preço)
- THE MeliAnalyticsPage SHALL exibir banner de alerta vermelho com contagem de rupturas quando `rupturaCount > 0`
- THE MeliAnalyticsPage SHALL usar virtualização (`useVirtualizer`) para renderizar a tabela de estoque sem degradação de performance
- THE MeliAnalyticsPage SHALL exibir colunas: SKU, Produto, Tipo (Full/Normal), Estoque, Estoque Full, Média/dia, Dias restantes, Alerta
- WHEN uma linha é clicada, THE MeliAnalyticsPage SHALL abrir `ProductDrawer` com detalhes completos do produto

### 12.6 `ProductDrawer`
- THE ProductDrawer SHALL ser renderizado via `createPortal` como painel lateral deslizante da direita
- THE ProductDrawer SHALL exibir animação de entrada (translate-x-full → translate-x-0) e saída com delay de 280ms
- THE ProductDrawer SHALL exibir: thumbnail, SKU, preço, tipo, estoques, vendidos, média/dia, dias restantes, alerta, status do anúncio
- WHEN `product.historySell` tem dados, THE ProductDrawer SHALL exibir gráfico de área com histórico dos últimos 30 dias
- THE ProductDrawer SHALL exibir link para o anúncio no ML

### 12.7 Aba Top Produtos
- THE MeliAnalyticsPage SHALL exibir ordenação por receita ou quantidade e toggle "Apenas ativos"
- WHEN `topSort` ou `topOnlyActive` mudam, THE MeliAnalyticsPage SHALL recarregar os dados

### 12.8 Aba Pedidos
- THE MeliAnalyticsPage SHALL usar virtualização (`useVirtualizer`) para a lista de pedidos (até 1000 itens)
- THE MeliAnalyticsPage SHALL carregar pedidos via `GET /meli/analytics/orders?limit=1000`

### 12.9 `AccountSelect`
- THE AccountSelect SHALL exibir dropdown customizado com lista de contas ML
- THE AccountSelect SHALL fechar ao clicar fora via `mousedown` listener
- THE AccountSelect SHALL destacar a conta selecionada com fundo verde e ícone de check

---

## 13. `MeliMessagesPage` (`/meli/messages`)

### 13.1 Seleção de conta e filtros
- THE MeliMessagesPage SHALL exibir botões de conta com badge vermelho por conta que tem mensagens não lidas (`hasDotForUserId`)
- THE MeliMessagesPage SHALL exibir filtros de status: Pendentes (UNANSWERED) e Respondidas (ANSWERED)
- WHEN a conta ou status é alterado, THE MeliMessagesPage SHALL resetar a pergunta selecionada e recarregar a lista

### 13.2 Lista de perguntas
- THE MeliMessagesPage SHALL exibir lista com até 50 perguntas via `GET /meli/messages/questions?user_id={id}&status={status}&page=1&limit=50`
- THE MeliMessagesPage SHALL exibir por pergunta: badge de status, tempo relativo, título do anúncio, texto da pergunta e resposta (se respondida)
- THE MeliMessagesPage SHALL selecionar automaticamente a primeira pergunta da lista ao carregar
- THE MeliMessagesPage SHALL exibir botão de exclusão (Trash2) visível no hover de cada pergunta
- WHEN uma pergunta é selecionada, THE MeliMessagesPage SHALL limpar o campo de resposta

### 13.3 Polling automático
- THE MeliMessagesPage SHALL fazer polling silencioso de `loadQuestions({ silent: true })` a cada **5 minutos** quando `document.hidden === false`

### 13.4 Painel de resposta
- THE MeliMessagesPage SHALL exibir thread de histórico do comprador quando `buyerThread.length >= 2`, carregada via `GET /meli/messages/questions/buyer-thread?from_id={id}&user_id={id}`
- THE MeliMessagesPage SHALL exibir a pergunta selecionada com número, título do anúncio e texto
- WHEN a pergunta está respondida, THE MeliMessagesPage SHALL exibir a resposta em destaque verde (somente leitura)
- WHEN a pergunta está pendente e `smartSuggestions` tem itens, THE MeliMessagesPage SHALL exibir chips de sugestão rápida
- WHEN uma sugestão é clicada, THE MeliMessagesPage SHALL inserir o texto no campo de resposta e mover o cursor para o final

### 13.5 Campo de resposta e autocomplete de templates
- THE MeliMessagesPage SHALL exibir textarea de resposta com ref para controle de cursor
- WHEN o usuário digita `#` seguido de texto, THE MeliMessagesPage SHALL abrir dropdown de autocomplete de templates filtrado pelo texto digitado
- THE MeliMessagesPage SHALL suportar navegação no dropdown com ArrowUp/ArrowDown e seleção com Enter/Tab
- WHEN um template é selecionado via autocomplete, THE MeliMessagesPage SHALL substituir o token `#nome` pelo conteúdo do template
- THE MeliMessagesPage SHALL fechar o dropdown ao pressionar Escape ou clicar fora

### 13.6 Busca e inserção de produto
- THE MeliMessagesPage SHALL exibir campo de busca de produto com debounce de 300ms via `GET /meli/products/autocomplete?q={query}`
- WHEN um produto é clicado, THE MeliMessagesPage SHALL inserir texto formatado `{saudação}! Aqui está o anúncio que você procura. {permalink}` na posição do cursor

### 13.7 Envio de resposta
- WHEN "Enviar" é clicado com texto vazio, THE MeliMessagesPage SHALL exibir toast de aviso
- WHEN "Enviar" é clicado com texto, THE MeliMessagesPage SHALL chamar `POST /meli/messages/questions/{id}/reply` e recarregar a lista e o badge de não lidas

### 13.8 Sincronização
- WHEN "Sincronizar" é clicado, THE MeliMessagesPage SHALL chamar `POST /meli/messages/sync`, recarregar perguntas e chamar `fetchUnread()`

### 13.9 Templates
- THE MeliMessagesPage SHALL exibir seção de templates com lista de templates ativos
- THE MeliMessagesPage SHALL suportar criação (POST), edição (PUT) e exclusão (DELETE) de templates
- WHEN um template é clicado na lista, THE MeliMessagesPage SHALL inserir o conteúdo na posição do cursor no campo de resposta

---

## 14. `PlansPage` (`/plans`)

### 14.1 Exibição de planos
- THE PlansPage SHALL carregar planos via `GET /plans` e status de assinatura via `GET /stripe/status`
- THE PlansPage SHALL exibir 4 cards de planos com nome, preço, limites e lista de features
- THE PlansPage SHALL destacar o plano atual com borda `border-brand-500` e label "Plano atual"
- THE PlansPage SHALL exibir badges "Popular" e "Completo" nos planos Pro e Business respectivamente

### 14.2 Controle de acesso
- WHEN `isOwner === false`, THE PlansPage SHALL exibir banner informativo de que apenas o administrador pode alterar o plano
- WHEN `isOwner === false`, THE PlansPage SHALL não exibir botões de ação nos cards

### 14.3 Upgrade/Downgrade
- WHEN o Owner clica em um plano pago, THE PlansPage SHALL chamar `POST /stripe/checkout` e redirecionar para `data.url`
- WHEN o Owner clica no plano Free e tem assinatura ativa, THE PlansPage SHALL chamar `POST /stripe/downgrade` e exibir toast informativo
- WHEN o Owner clica no plano Free sem assinatura, THE PlansPage SHALL chamar `PUT /auth/plan` e recarregar a página

### 14.4 Callbacks do Stripe
- WHEN a URL contém `?status=success`, THE PlansPage SHALL exibir toast de sucesso e recarregar a página após 2 segundos
- WHEN a URL contém `?status=canceled`, THE PlansPage SHALL exibir toast informativo
- THE PlansPage SHALL remover os parâmetros `status` e `session_id` da URL após processar

### 14.5 Status de assinatura
- WHEN `subStatus.subscription` existe, THE PlansPage SHALL exibir card com plano, data de renovação e badge de status (Ativa / Pagamento pendente)
- WHEN `subStatus.subscription.cancelAtPeriodEnd === true`, THE PlansPage SHALL exibir banner de aviso com data de encerramento

### 14.6 Portal de cobrança
- WHEN `user.hasSubscription === true` e `isOwner === true`, THE PlansPage SHALL exibir botão "Gerenciar assinatura e pagamento" que chama `POST /stripe/portal`

---

## 15. `TeamPage` (`/team`)

### 15.1 Abas
- THE TeamPage SHALL exibir abas "Usuários" e "Times" com contadores `{atual}/{máximo}` do plano

### 15.2 Aba Usuários
- THE TeamPage SHALL exibir lista de Members com: avatar, nome, email, permissões diretas (badges) e times associados (badges)
- THE TeamPage SHALL exibir botão "Novo usuário" desabilitado quando `users.length >= maxTeamUsers`
- THE TeamPage SHALL exibir botões de ação por usuário: alterar senha, editar, excluir

### 15.3 Formulário de usuário (`UserForm`)
- THE UserForm SHALL exibir campos: Nome (obrigatório), Email (obrigatório, apenas criação), Senha (obrigatório, apenas criação, mínimo 6 chars)
- THE UserForm SHALL exibir checkboxes de permissões diretas por módulo, desabilitando módulos não disponíveis no plano (`planModules`)
- THE UserForm SHALL exibir checkboxes de times disponíveis com suas permissões listadas

### 15.4 Alterar senha (`ChangePasswordModal`)
- THE TeamPage SHALL exibir modal com campo de nova senha (mínimo 6 chars) via `PUT /team/users/{id}/password`

### 15.5 Exclusão de usuário
- WHEN "Excluir" é clicado, THE TeamPage SHALL exibir modal de confirmação e chamar `DELETE /team/users/{id}` quando confirmado

### 15.6 Aba Times
- THE TeamPage SHALL exibir lista de times com nome, permissões (badges) e painel expansível de membros
- THE TeamPage SHALL exibir botão "Novo time" desabilitado quando `teams.length >= maxTeams`

### 15.7 Formulário de time (`TeamForm`)
- THE TeamForm SHALL exibir campo Nome e checkboxes de permissões por módulo (desabilitando módulos fora do plano)

### 15.8 Painel de membros (`TeamMembersPanel`)
- THE TeamMembersPanel SHALL ser expansível (toggle)
- THE TeamMembersPanel SHALL exibir membros atuais com botão de remoção (`DELETE /team/teams/{teamId}/members/{userId}`)
- THE TeamMembersPanel SHALL exibir não-membros com botão de adição (`POST /team/teams/{teamId}/members`)

---

## 16. `SettingsPage` (`/settings`)

### 16.1 Abas
- THE SettingsPage SHALL exibir 3 abas: Plano, Minhas lojas, Cookies ML
- THE SettingsPage SHALL sincronizar a aba ativa com o parâmetro `?tab=` da URL (replace, sem histórico)
- THE SettingsPage SHALL usar a aba "Plano" como padrão quando nenhum parâmetro está presente

### 16.2 Aba Plano (`SettingsPlanSection`)
- THE SettingsPlanSection SHALL exibir plano atual, limites (maxLinks, maxSellerMonitors) e data de renovação/encerramento
- THE SettingsPlanSection SHALL exibir lista de módulos incluídos no plano (`planModules`)
- WHEN `user.role === "member"`, THE SettingsPlanSection SHALL exibir seção "Seu acesso" com `allowedModules`
- WHEN `isOwner === true`, THE SettingsPlanSection SHALL exibir link para `/plans` e botão "Gerenciar assinatura" (quando tem assinatura)

### 16.3 Aba Minhas lojas (`SettingsStoresSection`)
- THE SettingsStoresSection SHALL carregar nomes de lojas via `GET /settings` e exibir em textarea (um por linha)
- WHEN salvo, THE SettingsStoresSection SHALL chamar `PUT /settings` com array `mySellerNames` (split por newline e vírgula)
- WHEN `user.role !== "owner"` e `user.role !== "admin"`, THE SettingsStoresSection SHALL exibir aviso e desabilitar a edição

### 16.4 Aba Cookies ML (`SettingsCookiesSection`)
- THE SettingsCookiesSection SHALL carregar contagem de cookies via `GET /cookies` e exibir
- THE SettingsCookiesSection SHALL exibir textarea para colar JSON de cookies
- WHEN "Salvar cookies" é clicado, THE SettingsCookiesSection SHALL validar o JSON (array ou `{ cookies: [...] }`), verificar que cada item tem `name` e `value` string, e chamar `POST /cookies`
- WHEN salvo com sucesso, THE SettingsCookiesSection SHALL chamar `refreshCookieStatus()` para atualizar o banner no AppLayout
- WHEN "Limpar todos" é clicado, THE SettingsCookiesSection SHALL abrir `ConfirmDialog` e chamar `DELETE /cookies` quando confirmado

### 16.5 Zona de perigo (somente Owner)
- WHEN `isOwner === true`, THE SettingsPage SHALL exibir seção "Zona de perigo" com botão "Finalizar minha conta"
- WHEN o botão é clicado, THE SettingsPage SHALL abrir modal listando os dados que serão apagados permanentemente
- WHEN `user.hasSubscription === true`, THE SettingsPage SHALL exibir aviso de cancelamento automático da assinatura no modal
- WHEN confirmado, THE SettingsPage SHALL chamar `deleteAccount()` do AuthContext

---

## 17. `SetupCookiesPage` (`/setup-cookies`)

- THE SetupCookiesPage SHALL exibir fluxo guiado de 4 passos com indicadores visuais de progresso
- Passo 1: link para instalar Cookie-Editor na Chrome Web Store
- Passo 2: link para abrir o Mercado Livre com aviso de que é necessário estar logado
- Passo 3: instruções detalhadas para exportar cookies via Cookie-Editor (3 sub-passos)
- Passo 4: textarea para colar o JSON e botão "Salvar e concluir"
- WHEN o JSON é salvo com sucesso, THE SetupCookiesPage SHALL chamar `refreshCookieStatus()`, exibir tela de sucesso e redirecionar para `/dashboard` após 1,8 segundos
- THE SetupCookiesPage SHALL aplicar as mesmas validações de JSON que `SettingsCookiesSection`

---

## 18. `HelpPage` (`/ajuda`)

- THE HelpPage SHALL exibir diagrama visual do fluxo principal (Links → Análise de Preços) e módulos independentes
- THE HelpPage SHALL exibir cards expansíveis por módulo, filtrados pelos módulos que o usuário tem acesso (`canAccess`)
- Cada card SHALL exibir: o que é, como usar (lista numerada), tabela comparativa (apenas para Análise de Preços) e dica
- THE HelpPage SHALL exibir link para o FAQ público no rodapé

---

## 19. Componentes Compartilhados

### 19.1 `ConfirmDialog` (`src/components/ConfirmDialog.jsx`)
- THE ConfirmDialog SHALL ser um modal de confirmação reutilizável com props: `open`, `title`, `message`, `confirmLabel`, `onConfirm`, `onClose`
- THE ConfirmDialog SHALL exibir botões "Cancelar" e o label de confirmação customizado

### 19.2 `OnboardingModal` (`src/components/OnboardingModal.jsx`)
- THE OnboardingModal SHALL exibir modal de boas-vindas na primeira visita do usuário após registro

### 19.3 `SEO` (`src/components/SEO.jsx`)
- THE SEO component SHALL usar `react-helmet-async` para injetar meta tags de título, descrição e canonical

### 19.4 `PublicLayout` (`src/components/PublicLayout.jsx`)
- THE PublicLayout SHALL ser o shell das páginas públicas (login, register, etc.)

### 19.5 `LandingHeader` (`src/components/LandingHeader.jsx`)
- THE LandingHeader SHALL ser o cabeçalho das páginas institucionais públicas

---

## 20. Hooks e Utilitários

### 20.1 `useSmartSuggestions` (`src/hooks/useSmartSuggestions.js`)

- THE useSmartSuggestions hook SHALL receber o texto de uma pergunta e retornar até 3 sugestões de resposta rápida
- THE hook SHALL usar `useMemo` para recalcular apenas quando `questionText` muda
- THE hook SHALL aplicar matching case-insensitive por palavras-chave em 9 categorias: frete/entrega, preço/desconto, disponibilidade/estoque, garantia/defeito, nota fiscal, pagamento, personalização, fotos, variações
- THE hook SHALL retornar no máximo 3 sugestões, parando de processar regras quando esse limite é atingido
- WHEN `questionText` é `null` ou `undefined`, THE hook SHALL retornar array vazio

### 20.2 `parseXML` (`src/lib/priceAnalyzeXml.js`)

- THE parseXML function SHALL receber o conteúdo XML e um array opcional de nomes de lojas próprias
- WHEN `myStoresUppercase` é fornecido e não vazio, THE parseXML SHALL usar esse array para identificar lojas próprias; caso contrário, usa `VITE_PRICE_ANALYZE_MY_SELLERS` ou lista padrão hardcoded
- THE parseXML SHALL parsear o XML via `DOMParser`, extrair `data_extracao` do elemento raiz `<produtos>` e iterar sobre elementos `<produto>`
- THE parseXML SHALL agrupar produtos pelo atributo `grupo` e para cada grupo calcular:
  - `minPrice` e `maxPrice` dos concorrentes (ou de todos se não há concorrentes)
  - `recommendation`: gerada quando o melhor preço do concorrente é menor que o menor preço próprio, ou quando a diferença supera `PRICE_DIFF_THRESHOLD` (10%)
- THE parseXML SHALL retornar `{ productGroups, extractionDate }`
- WHEN o XML contém `<parsererror>`, THE parseXML SHALL lançar `Error("Erro ao fazer parse do XML")`

### 20.3 `notify` (`src/utils/notify.js`)

- `notifyError(message)`: exibe toast de erro via `sonner`
- `notifySuccess(message)`: exibe toast de sucesso via `sonner`
- `notifyWarning(message)`: exibe toast de aviso via `sonner`
- `apiErrorMessage(error, fallback)`: extrai mensagem de erro da resposta da API (`error.response.data.error` + `hint`), retornando `fallback` se não disponível

### 20.4 `MODULE_LABELS` (`src/lib/moduleLabels.js`)

- Mapa de chaves de módulo para rótulos em português, usado em `SettingsPlanSection` e `TeamPage`

---

## 21. Propriedades de Corretude (Property-Based Testing)

Esta seção define as propriedades formais que o sistema deve satisfazer, verificáveis via testes de propriedade.

### 21.1 Controle de Acesso

**P1 — Consistência de canAccess com isBlockedByPlan**
- PARA TODO módulo `m` e usuário `u`: se `isBlockedByPlan(m) === true`, então `canAccess(m) === false`
- A recíproca não é necessariamente verdadeira: um módulo pode estar no plano mas bloqueado por permissão de Member

**P2 — Módulos de Owner sempre acessíveis**
- PARA TODO usuário com `role === "owner"`: `canAccess(null) === true` (rotas sem módulo são sempre acessíveis)

**P3 — Hierarquia de planos é monotônica**
- Se o plano `business` inclui módulo `m`, então qualquer plano que inclua `m` é um subconjunto de `business`
- Formalmente: `moduleMap[m]` é sempre um prefixo da lista `[free, starter, pro, business]` ou um subconjunto contíguo

**P4 — Permissões efetivas de Member**
- As permissões efetivas de um Member são a união de `permissions` diretas com as permissões de todos os times aos quais pertence
- `effectivePermissions(user) = union(user.permissions, ...user.teams.map(t => t.permissions))`

### 21.2 Cálculo de Peso Cúbico

**P5 — Fórmula de peso cúbico de produto**
- PARA TODA combinação de dimensões `(L, C, A)` positivas: `pesoCubico = (L × C × A) / 6000`
- O resultado deve ser arredondado para 3 casas decimais

**P6 — Fórmula de peso cúbico de caixa**
- PARA TODA combinação de dimensões `(L, C, A)` positivas: `cubadoCaixa = (L × C × A) / 5900`

**P7 — Resultado do verificador de pacote é determinístico**
- PARA OS MESMOS inputs (dimensões da caixa, lista de produtos com quantidades), o resultado (APROVADO/REPROVADO) é sempre o mesmo
- `cubadoCaixa <= cubadoLimiteTotal` → APROVADO; caso contrário → REPROVADO

**P8 — Margem de peso**
- PARA TODO pacote com `pesoEsperado > 0`: `pesoDivergente = |pesoInformado - pesoEsperado| / pesoEsperado > 0.05`
- WHEN `pesoEsperado === 0`, `pesoDivergente` é sempre `false`

### 21.3 Projeção de Receita (AISection)

**P9 — Projeção é monotônica em relação ao número de SKUs**
- PARA cenário fixo e período fixo: `project(winableSkus + 1) > project(winableSkus)` quando `medianPrice > 0`

**P10 — Projeção é monotônica em relação ao período**
- PARA cenário e SKUs fixos: `project(20) > project(15) > project(10)` quando `medianPrice > 0` e `winableSkus > 0`

**P11 — Cenário Moderado sempre >= Conservador**
- PARA os mesmos `winableSkus`, `days` e `medianPrice`: `project_moderado(days) >= project_conservador(days)`

### 21.4 Análise de Preços (parseXML)

**P12 — Grupos são disjuntos**
- PARA TODO XML válido: cada produto pertence a exatamente um grupo (pelo atributo `grupo`)
- `sum(group.products.length for group in productGroups) === total_products_in_xml`

**P13 — Recomendação só existe quando há concorrentes e lojas próprias**
- PARA TODO grupo `g`: `g.recommendation !== undefined` implica `g.products.some(p => p.isMyStore) && g.products.some(p => !p.isMyStore)`

**P14 — Threshold de recomendação**
- PARA TODO grupo com recomendação de redução: a diferença percentual entre o preço médio próprio e o melhor preço do concorrente é `> 0%` (concorrente está na frente)

### 21.5 Paginação e Filtros (LinksPage)

**P15 — Reset de página ao filtrar**
- PARA TODA alteração de filtro (status, tag, busca, SKU, vendedor): a página é resetada para 1

**P16 — Contagem de links é consistente com o limite**
- `total <= maxLinks` é invariante do sistema (garantido pelo backend, verificado no frontend via barra de progresso)
- A barra de progresso exibe `min((total / maxLinks) * 100, 100)%` — nunca ultrapassa 100%

### 21.6 Polling e Sincronização

**P17 — Polling do SellerMonitor adapta frequência**
- WHEN `sellers.some(s => s.scraping)`: intervalo = 4000ms
- WHEN `!sellers.some(s => s.scraping)`: intervalo = 30000ms
- A transição entre os dois estados é imediata na próxima iteração do `useEffect`

**P18 — Polling de notificações respeita visibilidade**
- O polling de `fetchUnread` só executa quando `document.hidden === false`
- Intervalo fixo de 90000ms independente do estado da aplicação

---

## 22. Dependências e Stack

| Dependência | Versão | Uso |
|---|---|---|
| react | 18.3 | Framework UI |
| react-dom | 18.3 | Renderização DOM |
| react-router-dom | 6.26 | Roteamento SPA |
| vite | 5.3 | Build tool e dev server |
| tailwindcss | 3.4 | Estilização utilitária |
| axios | 1.9 | Cliente HTTP com interceptors |
| sonner | — | Sistema de toasts |
| lucide-react | — | Ícones SVG |
| date-fns | 4.1 | Formatação de datas |
| recharts | 2.12 | Gráficos (Analytics ML) |
| @tanstack/react-virtual | 3.13 | Virtualização de listas longas |
| react-helmet-async | — | Meta tags SEO |

---
