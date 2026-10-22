# Design System "Holo" — Design

## Tokens

- `frontend/tailwind.config.js` — cores semânticas (`void`, `surface`, `surface-2/3`, `line`, `fg`, `glow`, `neon`, `warn`, `danger`), `brand`/`brandSolid` (azul da logo), fonte `display` (Space Grotesk), sombras `glow*` e animações (`pulse-glow`, `spin-slow`).
- `frontend/src/styles/globals.css` — CSS vars RGB dos tokens e classes de componente:
  - `.glass` (painel de vidro), `.glow-top` (linha de luz no topo), `.hud-corners` (colchetes HUD)
  - `.field` (inputs/selects/textarea), `.seg` / `.seg-btn` (controle segmentado; ativo via `aria-pressed="true"`)
  - `.popover` (dropdowns), `.table-holo`, `.num` (números tabulares em Space Grotesk)
- Fontes carregadas em `frontend/index.html`: DM Sans (corpo) e Space Grotesk (títulos e números).

## Tema claro

- `src/contexts/ThemeContext.jsx` (`ThemeProvider`, `useTheme`) guarda `"dark" | "light"` em `localStorage("theme")` e aplica `data-theme="light"` no `<html>`; script inline em `index.html` aplica antes do React montar.
- `globals.css`: `:root[data-theme="light"]` redefine as mesmas vars (`void`, `surface*`, `line`, `fg*`, `glow`, `neon`, `warn`, `danger`) + vars novas: `--ink` (sobreposições neutras: `bg-ink/[0.04]` no lugar de `bg-white/…`), `--scrim` (fundo de modais), `--brand-200/300`, `--violet-200/300`, `--pink-300` (tons de texto que invertem), `--glass-a1/a2/hi`, `--panel-shadow`.
- Cores de brilho em classes arbitrárias e estilos inline usam `rgb(var(--glow) / x)` etc., então acompanham o tema. `chartTheme.js` também usa vars (SVG aceita `var()` em `fill`/`stroke`/`stop-color`).
- `components/ThemeToggle.jsx` — botão sol/lua (topbar do `AppLayout`, `LandingHeader`, telas de auth). Toaster (`sonner`) recebe o tema atual.
- `.dark-only` some no tema claro (poeira estelar do fundo). Dashboard: `LIGHT_ACCENT` escurece as cores dos cards de módulo; `HoloDeck` usa a versão 2D no claro.
- Regra para código novo: nunca `bg-white/…`/`border-white/…` para sobreposição neutra — usar `ink`; nunca cor fixa de brilho — usar as vars.

## Componentes

- `src/components/ui/` — `Button`, `Card`/`Panel`, `Alert`, `Badge`, `Input`/`Select`, `Modal` (animado com `motion`), `PageHeader`, `Tabs`, `EmptyState`, `Kpi`.
- `src/components/fx/` — efeitos decorativos: `GridBackground`, `HoloRing`, `LiveDot`, `AnimatedNumber`, `SpotlightPanel`, `RingGauge`, `Sparkline`, `Radar`.
- `src/components/charts/` — `NeonTooltip` e `ChartGlowDefs` (filtro de brilho + gradientes). Recharts ignora componentes desconhecidos como filhos, então `ChartGlowDefs` é chamado como função: `{ChartGlowDefs()}`.
- `src/lib/chartTheme.js` — cores, grid, eixos, tooltip e `neonActiveDot` padrão dos gráficos.
- `src/components/BrandLogo.jsx` — marca hexagonal em SVG + nome em texto branco (substitui `logo.png`, que tem texto escuro).
- `src/components/auth/AuthShowcase.jsx` — painel direito das telas de login/cadastro/senha.

## Hero 3D do Dashboard

- `dashboard/HoloDeck.jsx` decide entre 3D e 2D (WebGL disponível, sem movimento reduzido, error boundary).
- `dashboard/HoloScene3D.jsx` — React Three Fiber (v8, compatível com React 18): plataforma com anéis emissivos, régua girando, partículas, feixe de luz em shader, bloom (`@react-three/postprocessing`) e paralaxe com o mouse. Os painéis de dados são DOM real posicionado no espaço via `drei/Html transform`.
- `dashboard/HoloPanels.jsx` — conteúdo dos painéis (competitividade, perguntas por horário, links monitorados), compartilhado com o fallback `dashboard/HoloDeck2D.jsx`.
- Carregado com `React.lazy` → chunk `HoloScene3D-*.js` separado.

## Landing

- `landing/index.html` replica os tokens no `tailwind.config` inline e as classes `.glass`, `.glow-top`, `.hud` no `<style>`.
- `landing/assets/`: `hero.mp4`/`hero.webm` (trecho de ~5,6 s do vídeo da marca, sem áudio), `hero-poster.jpg`, `logo-mark.svg`, `favicon.png`.
- Deploy: push na `main` → GitHub Action (`.github/workflows/deploy.yml`) → `deploy.sh` copia `landing/index.html` e `landing/assets/` para `/var/www/mlsmarthub-landing/`. Após o `git pull`, o script se reexecuta (`DEPLOY_REEXEC`) para que alterações no próprio `deploy.sh` valham no mesmo deploy.
