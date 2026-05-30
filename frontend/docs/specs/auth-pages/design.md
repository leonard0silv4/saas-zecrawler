# Páginas de Autenticação — Design

## Arquivos

- `src/pages/LoginPage.jsx`
- `src/pages/RegisterPage.jsx`
- `src/pages/ForgotPasswordPage.jsx`
- `src/pages/ResetPasswordPage.jsx`

## Implementação

Login e cadastro usam funções do `AuthContext`. Recuperação e reset usam o serviço Axios diretamente e exibem feedback local.

## Layout Split-Screen (Sessão D — 2026-05-30)

`LoginPage` e `RegisterPage` foram redesenhadas para layout split-screen — **sem** `PublicLayout`:

**Painel esquerdo (form):** `w-full lg:w-[480px]` com `bg-white`, logo, heading, formulário e links.
**Painel direito (brand):** `hidden lg:flex flex-1 bg-gradient-to-br from-brand-600 to-brand-900` com:
- Grid/dot pattern decorativo (opacity baixa)
- Heading e descrição da plataforma
- Lista de features com ícones Lucide
- Rodapé `© ML SmartHub`

**Erros de API:** substituídos pelo componente `Alert variant="error"` (com botão de fechar) em vez do `div.bg-red-50` inline.

`ForgotPasswordPage` foi redesenhada com o mesmo padrão split-screen (2026-05-30):
- Painel esquerdo: 3 estados (form / sucesso / email não encontrado), usa `Alert` component
- Painel direito: `bg-gradient-to-br from-brand-700 to-brand-900` com 3 pontos de segurança (Clock, Mail, ShieldCheck)
- Sem `PublicLayout` — layout próprio como Login e Register
- **Fix logo esticada:** `self-start` adicionado ao `<img>` para evitar stretch em `flex flex-col`

`ResetPasswordPage` redesenhada com split-screen (2026-05-30):
- Painel esquerdo: 3 estados (form / sucesso / token inválido), usa `Alert variant="error"`, `self-start` na logo
- Painel direito: `bg-gradient-to-br from-brand-600 to-brand-800` com 3 bullets de segurança (ShieldCheck, Lock, CheckCircle2)
- Sem `PublicLayout` — layout próprio idêntico ao padrão das demais auth pages
- Toda lógica original preservada: validação, redirect 3s, token de URL
