# Requisitos — Módulo de Seller Monitor

## Visão Geral

Monitora páginas de vendedores concorrentes via scraping, detecta novos produtos e mudanças de preço, e gera alertas em tempo real via SSE.

---

## Requisitos Funcionais

### RF-01 Cadastro de Seller
- Aceita `url` (obrigatória) e `name` (opcional).
- URL deve ser única por owner.
- Ao cadastrar, inicia scraping inicial em background (não-bloqueante).
- Respeita limite de sellers do plano (`checkSellerMonitorLimit`).

### RF-02 Listagem de Sellers
- Retorna todos os sellers do owner com `totalProducts` e `unreadAlerts` calculados.

### RF-03 Atualização de Seller
- Permite alterar `name` e `url`.
- Se a URL mudar, apaga todos os produtos e alertas do seller e reinicia o scraping.
- Verifica conflito de URL com outros sellers do mesmo owner.

### RF-04 Exclusão de Seller
- Remove o seller e todos os seus produtos e alertas em cascata.

### RF-05 Listagem de Produtos
- Retorna produtos do seller ordenados por: novos primeiro, depois com preço alterado, depois por data de atualização.

### RF-06 Execução Manual de Scraping
- `POST /seller-monitor/:id/run` enfileira o scraping via `scraperQueue`.
- Retorna 409 se já há scraping em andamento ou na fila.
- Atualiza `scraping = true` e `scrapingStartedAt` antes de enfileirar.

### RF-07 Alertas
- Tipos: `price_change` (mudança de preço) e `new_product` (novo produto detectado).
- `GET /seller-monitor/:id/alerts` — lista alertas do seller.
- `PUT /seller-monitor/alerts/:alertId/read` — marca alerta como lido.
- `PUT /seller-monitor/:id/alerts/read-all` — marca todos como lidos.

### RF-08 Reset de Scraping Travado
- `POST /seller-monitor/:id/reset-stuck` — zera `scraping = false` e `scrapingStartedAt = null`.

---

## Requisitos Não-Funcionais

- Scraping usa fila com Bottleneck para respeitar rate limits.
- Cron job diário às 4h executa scraping de todos os sellers ativos.
- Cron job a cada 15min reseta scrapings travados por timeout (> 45min).
- Alertas são emitidos via SSE para o frontend em tempo real.

---

## Modelo de Dados

### SellerPage
| Campo | Tipo | Descrição |
|---|---|---|
| `url` | String (required) | URL da página do seller |
| `name` | String | Nome amigável |
| `ownerId` | ObjectId ref User | Dono |
| `active` | Boolean | Se está ativo para monitoramento |
| `scraping` | Boolean | Se scraping está em andamento |
| `scrapingStartedAt` | Date | Quando o scraping atual começou |
| `lastRunAt` | Date | Última execução concluída |

### SellerProduct
| Campo | Tipo | Descrição |
|---|---|---|
| `sellerId` | ObjectId ref SellerPage | Seller dono do produto |
| `url` | String | URL do produto |
| `name` | String | Nome do produto |
| `image` | String | URL da imagem |
| `sku` | String | SKU do produto |
| `currentPrice` | Number | Preço atual |
| `priceHistory` | [{price, date}] | Histórico de preços |
| `isNew` | Boolean | Produto novo detectado |
| `priceChanged` | Boolean | Preço mudou no último scraping |

### SellerAlert
| Campo | Tipo | Descrição |
|---|---|---|
| `sellerId` | ObjectId ref SellerPage | Seller relacionado |
| `productId` | ObjectId ref SellerProduct | Produto relacionado |
| `type` | enum: price_change/new_product | Tipo do alerta |
| `oldPrice` | Number | Preço anterior |
| `newPrice` | Number | Novo preço |
| `read` | Boolean | Se foi lido |

---

## Propriedades de Correção

- **P1**: Ao deletar um seller, todos os `SellerProduct` e `SellerAlert` com `sellerId` igual devem ser removidos.
- **P2**: Ao atualizar a URL de um seller, produtos e alertas antigos devem ser removidos antes do novo scraping.
- **P3**: `runScrape` deve retornar 409 se `seller.scraping === true` ou `isSellerPending(seller._id) === true`.
- **P4**: Alertas de um seller não devem ser visíveis para owners diferentes do dono do seller.
