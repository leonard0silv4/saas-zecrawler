# Design — Data Retention

## Cron de Limpeza (`runDataCleanup`)

Agendado diariamente às **3:00 AM UTC** em `src/services/cron.js`.

```
cron("0 3 * * *") → runDataCleanup()
  cutoff = now - 90 dias
  Promise.all([
    MeliQuestion.deleteMany({ createdAt: { $lt: cutoff } }),
    MeliOrder.deleteMany({ createdAt: { $lt: cutoff } }),
    SellerAlert.deleteMany({ createdAt: { $lt: cutoff } }),
  ])
```

Implementação em `src/services/dataCleanupService.js`.

## Limpeza de Produtos Órfãos

Integrada ao final de `syncProductsForConta` em `MeliController.js`:

```
syncProductsForConta(conta, ownerId):
  allIds = fetchAllSellerItemIds(...)   // falha → lança erro, não chega na deleção
  upsertProductsFromItems(...)          // atualiza dados atuais
  MeliProduct.deleteMany({              // remove o que não veio da API
    ownerId, contaId: conta._id,
    id: { $nin: allIds }
  })
```

Dispara diariamente às **1:00 AM UTC** junto com o sync de produtos (Business plan).

## Por Que Não TTL Index

TTL indexes do MongoDB não permitem lógica condicional (ex: não apagar perguntas sem
resposta ainda relevantes). A abordagem por cron oferece mais controle e visibilidade
nos logs sem overhead permanente de índice.
