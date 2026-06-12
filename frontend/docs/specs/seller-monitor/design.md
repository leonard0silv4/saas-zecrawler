# SellerMonitorPage — Design

## Arquivos

- `src/pages/SellerMonitorPage.jsx`

## Implementação

Usa `@tanstack/react-query`. A lista de sellers é refetchada com `refetchInterval` dinâmico: 4s quando algum seller está em scraping, 30s caso contrário. Produtos e alertas são carregados com `enabled: !!selectedId`. Após mutations, `queryClient.invalidateQueries` é chamado nos keys relevantes.
