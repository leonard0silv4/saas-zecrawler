# Requisitos — Módulo de Integração Mercado Livre

## Visão Geral

Gerencia a autenticação OAuth 2.0 com o Mercado Livre, sincronização de produtos (anúncios), consulta de envios e autocomplete de produtos para uso em outros módulos.

---

## Requisitos Funcionais

### RF-01 Autenticação OAuth 2.0
- `GET /meli/auth` redireciona o usuário para o fluxo de autorização do ML com scopes `offline_access read write orders:read`.
- `GET /meli/callback` recebe o `code` e troca pelo `access_token` + `refresh_token`.
- Antes de salvar uma nova conta, verifica o limite de contas ML do plano (`planConfig.maxMeliAccounts`).
  - Reconexão de conta já existente (mesmo `user_id`) **não** é bloqueada pelo limite.
  - Limite excedido → página HTML de erro com link para `/plans`.
  - Free plan (`maxMeliAccounts=0`) → sempre bloqueado (o módulo `meli` já é negado via `requireModule`, esta é uma segunda camada de segurança).
- Salva a conta ML (`Conta`) com upsert por `user_id`.
- Exibe página HTML de confirmação com redirect automático para `/meli` após 3 segundos.
- Limpa `authError` ao reconectar uma conta.

**Limites de contas ML por plano:**

| Plano    | Max. Contas ML |
|----------|---------------|
| Free     | 0 (bloqueado) |
| Starter  | 1             |
| Pro      | 3             |
| Business | 10            |

### RF-02 Listagem de Contas Conectadas
- Retorna todas as contas ML ativas do owner (com `access_token` e não desabilitadas).

### RF-03 Desconexão de Conta
- Remove a `Conta` do banco.
- Remove todos os `MeliProduct` e `MeliQuestion` associados ao `user_id` desconectado.

### RF-04 Listagem de Produtos
- Retorna produtos do cache MongoDB para um `user_id` específico.
- Se o cache estiver vazio, sincroniza os primeiros 50 produtos da API do ML.

### RF-05 Autocomplete de Produtos
- Busca produtos por título, SKU ou ID (case-insensitive).
- Estratégia: cache MongoDB → revalidação live na API ML → busca direta na API ML.
- Revalida itens do cache na API ML para garantir que só retorna produtos ativos com estoque.
- Retorna no máximo 10 resultados com `{ source: "cache"|"api", items }`.

### RF-06 Permalink de Anúncio
- `GET /meli/items/:itemId/permalink` busca o permalink de um anúncio pelo ID.
- Ordem: cache MongoDB → API ML direta.
- Não filtra por status/estoque — apenas localiza o link.

### RF-07 Consulta de Envio
- `GET /meli/shipment/:shipmentId` retorna dados do envio, pedido associado e itens.
- Tenta todas as contas ativas do owner até encontrar uma com acesso ao envio.

### RF-08 Sincronização Completa de Produtos
- `syncProductsForConta(conta, ownerId)` busca todos os IDs de anúncios via paginação (100 por página, delay 250ms entre páginas).
- Processa em batches de 20 com delay de 300ms entre batches.
- Calcula `averageSellDay`, `daysRestStock` e `alertRuptura` para cada produto.
- Usa `bulkWrite` com upsert para eficiência.

### RF-09 Renovação Automática de Token
- `renewToken(conta)` renova o `access_token` se expirado.
- Suporta `{ force: true }` para forçar renovação independente da expiração.
- Salva o novo token no banco após renovação.

---

## Requisitos Não-Funcionais

- Rate limiting: delay de 250ms entre páginas de IDs e 300ms entre batches de detalhes.
- Tokens expirados são renovados automaticamente antes de qualquer chamada à API ML.
- Contas com `authError = "forbidden"` são ignoradas nos crons automáticos.

---

## Modelo de Dados — Conta

| Campo | Tipo | Descrição |
|---|---|---|
| `user_id` | Number (unique) | ID do vendedor no ML |
| `nickname` | String | Apelido do vendedor |
| `access_token` | String | Token de acesso atual |
| `refresh_token` | String | Token para renovação |
| `expires_at` | Date | Expiração do access_token |
| `disabled` | Boolean | Se a conta está desabilitada |
| `authError` | String | Erro de autorização (ex: "forbidden") |
| `ownerId` | ObjectId ref User | Dono da conta |

## Alertas de Ruptura de Estoque

| Condição | Alert |
|---|---|
| `isFull && availableQty === 0` | `"RUPTURA"` |
| `daysRestStock <= 3` | `"CRÍTICO"` |
| `daysRestStock <= 7` | `"BAIXO"` |
| Demais | `null` |

---

## Propriedades de Correção

- **P1**: Após callback OAuth, `Conta.findOne({ user_id })` deve existir com `access_token` válido e `authError = null`.
- **P2**: Após desconectar conta, `MeliProduct.find({ user_id })` e `MeliQuestion.find({ user_id })` devem retornar arrays vazios para o owner.
- **P3**: `renewToken` com token não-expirado deve retornar o `access_token` atual sem chamar a API ML.
- **P4**: `computeRupturaAlert` deve retornar `"RUPTURA"` apenas quando `isFull === true` e `availableQty === 0`.
