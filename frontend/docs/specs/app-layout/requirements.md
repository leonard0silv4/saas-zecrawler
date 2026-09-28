# AppLayout — Requirements

## Escopo

Shell autenticado da aplicação.

## Requisitos

- Deve exibir sidebar desktop com logo, navegação e área do usuário.
- Deve ocultar itens `ownerOnly` para usuários que não são owner.
- Deve diferenciar bloqueio por plano e por permissão.
- Deve exibir badge em Mensagens ML quando houver mensagens não lidas.
- Deve exibir topbar mobile e sidebar deslizante.
- Deve exibir banner informativo (laranja) quando o owner não tem nenhuma conta ML conectada (Links, Análise de Preços e Monitor de Sellers dependem dela). Status vem de `NotificationContext.hasMeliAccount` (`GET /meli/accounts`).
- Deve renderizar `OnboardingModal`.
