# Componentes Compartilhados — Design

## Biblioteca UI Base (`src/components/ui/`)

Criada em 2026-05-30 como parte da iniciativa "Mercado Clarity". Exporta 6 primitivos que padronizam os padrões visuais de toda a aplicação.

### Button (`Button.jsx`)
- **Variantes:** `primary` (brand-600), `secondary` (white+gray border), `ghost` (brand text transparente), `danger` (red-600)
- **Sizes:** `sm` (px-3 py-1.5), `md` (px-4 py-2), `lg` (px-5 py-2.5)
- **Props extras:** `loading` (spinner Loader2 + disabled automático), `className`
- Foco: `focus:ring-2 focus:ring-brand-500 focus:ring-offset-1`

### Card (`Card.jsx`)
- **Variantes:** `default` (shadow-sm + border gray-200), `elevated` (shadow-md), `bordered` (border-2 brand-300)
- Se `onClick` fornecido: `cursor-pointer + hover:shadow-md`
- Padding padrão: `p-6 rounded-xl`

### Alert (`Alert.jsx`)
- **Variantes:** `info`, `success`, `warning`, `error`
- Estrutura: `border-l-4` colorida + ícone Lucide + título opcional + conteúdo
- `onClose` opcional adiciona botão X

### Badge (`Badge.jsx`)
- **Variantes:** `blue`, `green`, `red`, `gray`, `amber`, `purple`, `pink`, `brand`
- **Sizes:** `sm` (px-2 py-0.5), `md` (px-2.5 py-1)
- Estilo pill: `rounded-full text-xs font-medium`

### Input (`Input.jsx`)
- Props: `label`, `id`, `error`, `helperText`, `disabled`, + todos os atributos nativos de `<input>`
- Estado error: `border-red-300 focus:ring-red-500`
- Estado disabled: `opacity-50 cursor-not-allowed bg-gray-50`

### Modal (`Modal.jsx`)
- Props: `isOpen`, `onClose`, `title`, `children`, `size` (sm/md/lg/xl), `footer`
- Usa `createPortal` → `document.body`, z-50
- Fecha com Escape e clique no backdrop (`bg-black/50 backdrop-blur-sm`)
- `max-h-[90vh]` com overflow scroll no body

### Re-export
Todos exportados via `src/components/ui/index.js`.

---

## Componentes de Layout e Seções

- `src/components/ConfirmDialog.jsx` — substitui window.confirm(), usa createPortal
- `src/components/OnboardingModal.jsx` — carousel de 7 slides por plano
- `src/components/SEO.jsx` — wrapper react-helmet-async
- `src/components/PublicLayout.jsx` — wrapper páginas públicas
- `src/components/LandingHeader.jsx` — header para páginas de landing
- `src/components/SettingsPlanSection.jsx` — seção de plano na página de settings
- `src/components/SettingsStoresSection.jsx` — seção de lojas na página de settings
- `src/components/SettingsCookiesSection.jsx` — seção de cookies ML na página de settings

## Padrões Visuais Padronizados

- Backdrop de modal: `bg-black/50 backdrop-blur-sm` (unificado — era `bg-black/40` em alguns lugares)
- Labels de form: `text-sm font-medium text-gray-700`
- Botão primário md: `px-4 py-2 text-sm`
- Botão primário lg: `px-5 py-2.5 text-base`
