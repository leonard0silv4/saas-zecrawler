# AppLayout — Design

## Arquivos

- `src/components/AppLayout.jsx`

## Implementação

`AppLayout` usa `Outlet` do React Router e consome `AuthContext` e `NotificationContext`. Bloqueios por plano enviam para `/plans`; bloqueios por permissão impedem navegação.

## Título da aba (react-helmet-async)

O shell autenticado define o `<title>` de cada página via `<Helmet>`, derivando o nome da rota atual a partir de `NAV_GROUPS` (mapa `ROUTE_TITLES` + extras como `/ajuda`, `/setup-cookies`), no formato `Label | ML SmartHub` (fallback `ML SmartHub`). Rotas aninhadas casam pelo prefixo mais longo. Sem isso, o título ficava preso no da última página pública montada (ex.: "Login —…"), já que as páginas internas não renderizavam `<SEO>`/`<Helmet>`. O `LoginPage` passou a usar `title="Login"` (o componente `SEO` já acrescenta `| ML SmartHub`, evitando sufixo duplicado).

## Estrutura do Sidebar

Nav organizada em 3 grupos via `NAV_GROUPS`:
1. **Dashboard** — item único, sem label de seção
2. **Módulos** — ferramentas de trabalho (Links, Analytics ML, Mensagens, etc.)
3. **Conta** — itens admin/configurações (Time, Planos, Configurações)

Grupos separados por `<hr className="my-2.5 border-gray-100" />` com label de seção em `text-[10px] uppercase tracking-widest`.

## Visual (Sessão D — 2026-05-30)

- **Active state:** `bg-brand-50 text-brand-700 border-l-[3px] border-brand-600 pl-[9px]` — indicador lateral de 3px
- **User card:** avatar + nome + badge de plano colorido (`planColors`) no card `bg-gray-50`
- **Mobile overlay:** `bg-black/50 backdrop-blur-sm` (era `bg-gray-900/40`)
- **Background:** `bg-gray-50` (era `bg-gray-100/70`) — mais clean
- **Ícones nav:** `text-gray-400` em inativo, `text-brand-600` em ativo

## Navegação (lógica intacta)
- `ownerOnly: true` → oculto para não-owners
- `planLocked` → redireciona para `/plans` com ícone amber
- `permissionLocked` → `e.preventDefault()` com ícone gray
