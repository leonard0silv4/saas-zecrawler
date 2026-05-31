# MeliMessagesPage — Requirements

## Escopo

Central de perguntas e respostas Mercado Livre em `/meli/messages`.

## Requisitos

- Deve listar contas ML e perguntas com filtros.
- Deve agrupar perguntas por comprador (`from_id`) em uma interface de chat.
- Deve exibir histórico de mensagens de cada comprador como bolhas de chat.
- Deve destacar a pergunta pendente ativa dentro do thread com indicador visual.
- Deve exibir card de anúncio com thumbnail, preço, estoque e status (dados da coleção `MeliProduct`).
- Deve responder e excluir perguntas.
- Deve sincronizar perguntas manualmente.
- Deve carregar histórico completo do comprador via API ao selecionar uma conversa.
- Deve criar, editar, excluir e usar templates.
- Deve buscar produtos e permalinks para inserir na resposta.
- Deve atualizar contagem global de não lidas após ações relevantes.
