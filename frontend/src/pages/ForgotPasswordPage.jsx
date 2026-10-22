import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2, UserX, Clock, ShieldCheck, Lock } from "lucide-react";
import api from "../services/api";
import { Alert } from "../components/ui/Alert";
import BrandLogo from "../components/BrandLogo";
import AuthShowcase from "../components/auth/AuthShowcase";
import ThemeToggle from "../components/ThemeToggle";

const SECURITY_POINTS = [
  { icon: Clock,       text: "Link de redefinição expira em 24 horas" },
  { icon: Mail,        text: "Enviado apenas para o email cadastrado" },
  { icon: ShieldCheck, text: "Sem acesso à sua conta Mercado Livre" },
];

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      if (err.response?.data?.error === "email_not_found") {
        setNotFound(true);
      } else {
        setError(err.response?.data?.error || "Erro ao processar solicitação");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-void">

      {/* ── Painel esquerdo: form ──────────────────────────────── */}
      <div className="relative z-10 w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-8 lg:px-14 py-12 bg-surface/70 backdrop-blur-xl shrink-0">
        <ThemeToggle className="absolute right-6 top-6" />
        <BrandLogo size={34} className="mb-10 self-start" />

        {sent ? (
          /* Sucesso */
          <div className="space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-neon/10">
              <CheckCircle2 size={28} className="text-neon" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-fg">Email enviado!</h1>
              <p className="text-fg-muted mt-1 text-sm leading-relaxed">
                Enviamos o link de redefinição para <strong className="text-fg/90">{email}</strong>.
                Verifique sua caixa de entrada.
              </p>
            </div>
            <Alert variant="warning">
              Não encontrou? Verifique sua <strong>caixa de spam</strong> ou lixo eletrônico.
            </Alert>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-brandSolid-300 font-semibold hover:underline"
            >
              <ArrowLeft size={15} />
              Voltar ao login
            </Link>
          </div>

        ) : notFound ? (
          /* Email não encontrado */
          <div className="space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-warn/10">
              <UserX size={28} className="text-warn" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-fg">Email não encontrado</h1>
              <p className="text-fg-muted mt-1 text-sm leading-relaxed">
                Nenhuma conta foi encontrada com <strong className="text-fg/90">{email}</strong>.
                Verifique se digitou corretamente ou crie uma nova conta.
              </p>
            </div>
            <Link
              to="/register"
              className="flex items-center justify-center w-full py-2.5 rounded-lg bg-brandSolid-500 hover:bg-brandSolid-400 text-white text-sm font-semibold transition-colors shadow-glow-brand"
            >
              Criar conta
            </Link>
            <button
              type="button"
              onClick={() => setNotFound(false)}
              className="inline-flex items-center gap-1.5 text-sm text-fg-dim hover:text-fg-muted transition-colors"
            >
              <ArrowLeft size={14} />
              Tentar outro email
            </button>
          </div>

        ) : (
          /* Formulário principal */
          <>
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brandSolid-500/10 mb-5">
                <Lock size={22} className="text-brandSolid-300" />
              </div>
              <h1 className="text-2xl font-bold text-fg">Esqueceu a senha?</h1>
              <p className="text-fg-muted mt-1 text-sm">
                Informe seu email e enviaremos o link de redefinição.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="error" onClose={() => setError("")}>{error}</Alert>
              )}

              <div>
                <label className="block text-sm font-medium text-fg/90 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="field w-full"
                  placeholder="seu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brandSolid-500 hover:bg-brandSolid-400 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 shadow-glow-brand"
              >
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-fg-dim hover:text-fg-muted transition-colors pt-1"
              >
                <ArrowLeft size={14} />
                Voltar ao login
              </Link>
            </form>
          </>
        )}

        <p className="mt-auto pt-10 text-xs text-fg-dim text-center">
          © {new Date().getFullYear()} ML SmartHub
        </p>
      </div>

      {/* ── Painel direito: brand ─────────────────────────────── */}
      <AuthShowcase
        title={<>Sua senha<br />está segura</>}
        subtitle="O processo de redefinição é simples, rápido e completamente seguro. Você estará de volta em minutos."
        points={SECURITY_POINTS}
      />
    </div>
  );
}
