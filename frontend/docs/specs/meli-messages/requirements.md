# MeliMessagesPage — Requirements

## Escopo

Central de perguntas e respostas Mercado Livre em `/meli/messages`.

## Requisitos

- Deve listar contas ML em dropdown com badge vermelho por conta com mensagens não lidas.
- Deve filtrar perguntas por status (Pendentes / Respondidas) e ordenar conversas por data (mais novas / mais antigas).
- Deve permitir ordenar as mensagens dentro de uma conversa por data (mais antigas / mais novas primeiro).
- Deve agrupar perguntas por comprador (`from_id`) em uma interface de chat.
- Deve exibir histórico de mensagens de cada comprador como bolhas de chat.
- Deve destacar a pergunta pendente ativa dentro do thread com indicador visual.
- Quando um comprador perguntou sobre anúncios diferentes, deve exibir `ItemContextCard` inline na thread a cada mudança de `item_id` — impedindo que todos os itens pareçam ser sobre o mesmo anúncio.
- Deve buscar dados do anúncio via `GET /meli/items/:itemId/details` para todos os itens únicos da thread (Map por item_id).
- Deve responder e excluir perguntas.
- Deve exibir a resposta enviada imediatamente (update otimista) antes do refetch em background.
- Deve sincronizar perguntas manualmente.
- Deve carregar histórico completo do comprador via API ao selecionar uma conversa.
- Deve gerenciar templates via modal com aba "Templates" (busca + inserção) e aba "Gerenciar" (CRUD).
- Deve buscar anúncios e inserir permalink via modal dedicada.
- Deve atualizar contagem global de não lidas após ações relevantes.
- Deve recarregar silenciosamente a lista e o thread ativo ao receber evento SSE `meli:question` da conta selecionada.
- A tela deve ocupar 100vh sem scroll de página (layout `h-full flex flex-col`).
