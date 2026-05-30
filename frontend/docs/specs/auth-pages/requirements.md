# Páginas de Autenticação — Requirements

## Escopo

Login, cadastro, recuperação e reset de senha.

## Requisitos

- `LoginPage` deve chamar `login(email, password)` e redirecionar para `/dashboard` em sucesso.
- `RegisterPage` deve validar senha mínima de 6 caracteres e chamar `register`.
- `ForgotPasswordPage` deve chamar `POST /auth/forgot-password`.
- `ResetPasswordPage` deve ler token da query string e chamar `POST /auth/reset-password`.
