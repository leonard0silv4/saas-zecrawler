import nodemailer from "nodemailer";
import { Resend } from "resend";

// ── template compartilhado ──────────────────────────────────────────────────
function buildResetHtml(resetUrl) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8" /></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
              style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
              <tr>
                <td style="background:#2563eb;padding:28px 32px;">
                  <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                    ⚡ ML SmartHub
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">Redefinição de senha</h2>
                  <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                    Recebemos uma solicitação para redefinir a senha da sua conta.
                    Clique no botão abaixo para criar uma nova senha.
                  </p>
                  <div style="text-align:center;margin:0 0 28px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;
                              padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">
                      Redefinir minha senha
                    </a>
                  </div>
                  <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
                    Se o botão não funcionar, copie e cole este link no navegador:
                  </p>
                  <p style="margin:0 0 24px;font-size:12px;color:#2563eb;word-break:break-all;">
                    ${resetUrl}
                  </p>
                  <div style="border-top:1px solid #f3f4f6;padding-top:20px;">
                    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                      Este link expira em <strong>1 hora</strong>.
                      Se você não solicitou a redefinição de senha, ignore este email — sua senha permanece a mesma.
                    </p>
                  </div>
                  <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:16px;">
                    <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;line-height:1.6;">
                      Precisa de ajuda? Responda este e-mail ou fale com nosso suporte em
                      <a href="mailto:support@mlsmarthub.com.br"
                         style="color:#2563eb;text-decoration:none;">support@mlsmarthub.com.br</a>
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #f3f4f6;">
                  <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">
                    © ${new Date().getFullYear()} ML SmartHub · Todos os direitos reservados
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ── Resend ──────────────────────────────────────────────────────────────────
async function sendViaResend(to, resetUrl) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: "ML SmartHub <support@mlsmarthub.com.br>",
    to,
    subject: "Redefinição de senha — ML SmartHub",
    html: buildResetHtml(resetUrl),
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ── template: campanha promocional (cupom 50%) ──────────────────────────────
function buildPromoHtml(name, plansUrl) {
  const firstName = (name || "").trim().split(" ")[0] || "";
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8" /></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
              style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
              <tr>
                <td style="background:#2563eb;padding:28px 32px;">
                  <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                    ⚡ ML SmartHub
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">
                    ${firstName ? `${firstName}, temos` : "Temos"} um presente pra você 🎉
                  </h2>
                  <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
                    Que tal aproveitar todos os recursos pagos do ML SmartHub com
                    <strong>50% de desconto na sua primeira mensalidade</strong>?
                  </p>

                  <div style="text-align:center;margin:0 0 24px;">
                    <div style="display:inline-block;background:#eff6ff;border:2px dashed #2563eb;border-radius:10px;padding:14px 28px;">
                      <p style="margin:0;font-size:12px;color:#2563eb;letter-spacing:0.5px;text-transform:uppercase;">Cupom</p>
                      <p style="margin:2px 0 0;font-size:22px;font-weight:700;color:#111827;letter-spacing:1px;">DESCONTO50</p>
                    </div>
                  </div>

                  <div style="text-align:center;margin:0 0 28px;">
                    <a href="${plansUrl}"
                       style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;
                              padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">
                      Ver planos e assinar
                    </a>
                  </div>

                  <div style="border-top:1px solid #f3f4f6;padding-top:20px;">
                    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">
                      Como usar o cupom:
                    </p>
                    <ol style="margin:0;padding-left:18px;font-size:14px;color:#4b5563;line-height:2;">
                      <li>Acesse sua conta e vá em <strong>Planos e Preços</strong></li>
                      <li>Escolha o plano desejado e clique em <strong>Assinar agora</strong></li>
                      <li>Na página de pagamento do Stripe, clique em <strong>"Adicionar código promocional"</strong></li>
                      <li>Digite o código <strong>DESCONTO50</strong> e clique em Aplicar</li>
                      <li>Finalize o pagamento com 50% de desconto na primeira mensalidade</li>
                    </ol>
                  </div>

                  <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                    Oferta por tempo limitado, válida para novas assinaturas.
                  </p>

                  <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:20px;">
                    <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;line-height:1.6;">
                      Dúvidas? Responda este e-mail ou fale com nosso suporte em
                      <a href="mailto:support@mlsmarthub.com.br"
                         style="color:#2563eb;text-decoration:none;">support@mlsmarthub.com.br</a>
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #f3f4f6;">
                  <p style="margin:0 0 6px;font-size:12px;color:#d1d5db;text-align:center;">
                    © ${new Date().getFullYear()} ML SmartHub · Todos os direitos reservados
                  </p>
                  <p style="margin:0;font-size:11px;color:#d1d5db;text-align:center;">
                    Não quer mais receber emails promocionais? Responda este e-mail com "remover".
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

async function sendPromoViaResend(to, name, plansUrl) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: "ML SmartHub <support@mlsmarthub.com.br>",
    to,
    subject: "50% de desconto na sua primeira mensalidade 🎉",
    html: buildPromoHtml(name, plansUrl),
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ── Gmail (nodemailer) ──────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendViaGmail(to, resetUrl) {
  await transporter.sendMail({
    from: `"ML SmartHub" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Redefinição de senha — ML SmartHub",
    html: buildResetHtml(resetUrl),
  });
}

// ── ponto de entrada público ────────────────────────────────────────────────
export async function sendPasswordResetEmail(to, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const flow = (process.env.EMAIL_FLOW || "GMAIL").toUpperCase();

  if (flow === "RESEND") {
    await sendViaResend(to, resetUrl);
  } else {
    await sendViaGmail(to, resetUrl);
  }
}

export async function sendPromoEmail(to, name) {
  const plansUrl = `${process.env.FRONTEND_URL || "https://www.mlsmarthub.com.br"}/plans`;
  await sendPromoViaResend(to, name, plansUrl);
}
