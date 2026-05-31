# Requirements — Data Retention

## Problema

O MongoDB Atlas Free (512 MB) tem capacidade limitada. Collections de alto crescimento
(`meliorders`, `meliquestions`, `selleralerts`, `meliproducts`) acumulam dados
indefinidamente, tornando o limite atingível em 10 clientes × 3 meses.

## Retenção de Dados Históricos

- **MeliQuestion**: apagar registros com `createdAt` > 90 dias
- **MeliOrder**: apagar registros com `createdAt` > 90 dias
- **SellerAlert**: apagar registros com `createdAt` > 90 dias

## Limpeza de Produtos Órfãos

- **MeliProduct**: ao final de cada sync completo de uma conta, apagar produtos
  que não constam mais no inventário atual do vendedor na API ML

## Restrições

- A limpeza de dados históricos deve ser agendada fora do horário de maior uso
- A limpeza de produtos só ocorre se o sync completou com sucesso (API ML respondeu)
- Nenhuma deleção em cascade — outras collections dependentes não são afetadas
