# Team — Design

## Implementação

- Endpoints protegidos por `requireOwner` e limites `checkTeamUserLimit`/`checkTeamLimit` onde aplicável.
- Controller: `backend/src/controllers/TeamController.js`.
- Modelos usados: `User` e `Team`.
- Permissões válidas vêm de `MODULES` em `config/plans.js`.
- Vínculo de time é armazenado em `User.teamIds`.
