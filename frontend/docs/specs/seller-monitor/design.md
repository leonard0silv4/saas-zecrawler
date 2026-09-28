# SellerMonitorPage — Design

## Arquivos

- `src/pages/SellerMonitorPage.jsx`

## Implementação

Usa `@tanstack/react-query`. A lista de sellers é refetchada com `refetchInterval` dinâmico: 4s quando algum seller está em scraping, 30s caso contrário. Produtos e alertas são carregados com `enabled: !!selectedId`. Após mutations, `queryClient.invalidateQueries` é chamado nos keys relevantes.

## Varredura de catálogos (set/2026)

- `src/components/seller-monitor/CatalogScanPanel.jsx` — estado da varredura (polling 5 s enquanto roda), botão "Varrer agora" e modal de categorias (navegação por subcategorias, máx. 5).
- `src/components/seller-monitor/AddSellerModal.jsx` — cadastro por concorrente encontrado (filtro por nickname, catálogos em comum, menor preço) ou por link do vendedor.
- Card do seller mostra badge "Sem dados" (`noData`).
