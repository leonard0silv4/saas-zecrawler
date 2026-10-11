# Design System "Holo" — Requisitos

## Objetivo

Todas as telas do app (`app.mlsmarthub.com.br`) e o site institucional (`landing/index.html`) seguem uma identidade visual escura e futurista, inspirada no vídeo da marca: fundo preto, painéis de vidro flutuantes com brilho, cantos HUD, anéis holográficos e gráficos neon. O azul da logo continua sendo a cor de ação.

## Regras de cor

- **Ação / marca:** azul da logo `#1e7bff` (`brand-500` / `brandSolid-500`).
- **Luz / realce:** ciano `#40c8ff` (`glow`).
- **Dado positivo e status "ao vivo":** verde neon `#34f5a0` (`neon`). Não usar verde para botões de ação.
- **Alerta:** âmbar `#ffb84d` (`warn`). **Erro / perda:** `#ff5c70` (`danger`).
- **Texto:** `fg`, `fg-muted`, `fg-dim`. Não usar a escala `gray-*` nem `bg-white` em telas novas.

## Requisitos funcionais

- Contraste legível em todas as telas (texto principal `fg` sobre `void`/`surface`).
- `prefers-reduced-motion` desativa animações contínuas e a cena 3D.
- Layout responsivo até 390 px de largura.
- O hero do Dashboard usa cena 3D real (WebGL) em telas ≥ `lg`; sem WebGL, com movimento reduzido ou em erro, cai para a versão 2D.
- three.js é carregado sob demanda (chunk separado) — não pode entrar no bundle principal.
- A landing continua HTML estático com Tailwind via CDN e usa os mesmos tokens de cor (só tema escuro).
- **Tema claro opcional:** escuro é o padrão; botão sol/lua no topo do app, nas páginas públicas e nas telas de login alterna o tema. A escolha fica salva no navegador e é aplicada antes do primeiro paint (sem piscar).
- No tema claro, os acentos (neon, ciano, âmbar, vermelho, azul-claro, violeta) ficam em tons mais escuros para manter contraste sobre fundo branco; brilhos ficam sutis e o hero do Dashboard usa a versão 2D.
