# Tasks — Módulo de Autenticação

## Cobertura de Testes

- [ ] 1. Testes unitários para `sanitizeUser` — verificar que campos sensíveis nunca aparecem na saída
- [ ] 2. Testes de integração para `POST /auth/register` — email duplicado retorna 409, campos faltando retornam 400
- [ ] 3. Testes de integração para `POST /auth/login` — credenciais inválidas retornam 401 sem indicar qual campo
- [ ] 4. Testes para fluxo de reset de senha — token expirado retorna 400, token válido atualiza senha e zera campos
- [ ] 5. Teste para `DELETE /auth/account` — verificar cascata completa de deleção

## Melhorias Identificadas

- [ ]* 6. Adicionar rate limiting em `/auth/login` e `/auth/forgot-password` para prevenir brute force
- [ ]* 7. Validar força mínima de senha no registro (atualmente só exige 6 chars no reset, não no registro)
- [ ]* 8. Adicionar refresh token para evitar logout forçado após 30 dias
