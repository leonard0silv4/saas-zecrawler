import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2, UserX, Clock, ShieldCheck, Lock } from "lucide-react";
import api from "../services/api";
import { Alert } from "../components/ui/Alert";

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
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo: form ──────────────────────────────── */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-8 lg:px-14 py-12 bg-white shrink-0">
        <img src="/logo.png" alt="ML SmartHub" className="h-9 w-auto mb-10" />

        {sent ? (
          /* Sucesso */
          <div className="space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email enviado!</h1>
              <p className="text-gray-500 mt-1 text-sm leading-relaxed">
                Enviamos o link de redefinição para <strong className="text-gray-700">{email}</strong>.
                Verifique sua caixa de entrada.
              </p>
            </div>
            <Alert variant="warning">
              Não encontrou? Verifique sua <strong>caixa de spam</strong> ou lixo eletrônico.
            </Alert>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-brand-600 font-semibold hover:underline"
            >
              <ArrowLeft size={15} />
              Voltar ao login
            </Link>
          </div>

        ) : notFound ? (
          /* Email não encontrado */
          <div className="space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-50">
              <UserX size={28} className="text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email não encontrado</h1>
              <p className="text-gray-500 mt-1 text-sm leading-relaxed">
                Nenhuma conta foi encontrada com <strong className="text-gray-700">{email}</strong>.
                Verifique se digitou corretamente ou crie uma nova conta.
              </p>
            </div>
            <Link
              to="/register"
              className="flex items-center justify-center w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
            >
              Criar conta
            </Link>
            <button
              type="button"
              onClick={() => setNotFound(false)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={14} />
              Tentar outro email
            </button>
          </div>

        ) : (
          /* Formulário principal */
          <>
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 mb-5">
                <Lock size={22} className="text-brand-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Esqueceu a senha?</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Informe seu email e enviaremos o link de redefinição.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="error" onClose={() => setError("")}>{error}</Alert>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm bg-white"
                  placeholder="seu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors pt-1"
              >
                <ArrowLeft size={14} />
                Voltar ao login
              </Link>
            </form>
          </>
        )}

        <p className="mt-auto pt-10 text-xs text-gray-400 text-center">
          © {new Date().getFullYear()} ML SmartHub
        </p>
      </div>

      {/* ── Painel direito: brand ─────────────────────────────── */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 flex-col justify-between p-14 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/3" />

        <div className="relative z-10">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-brand-300 mb-8">
            ML SmartHub
          </span>
          <h2 className="text-4xl font-bold leading-tight text-white mb-4">
            Sua senha<br />está segura
          </h2>
          <p className="text-brand-200 text-base leading-relaxed max-w-sm">
            O processo de redefinição é simples, rápido e completamente seguro. Você estará de volta em minutos.
          </p>
        </div>

        <div className="relative z-10 space-y-5">
          {SECURITY_POINTS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-white" />
              </div>
              <span className="text-sm text-brand-100">{text}</span>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-xs text-brand-400">
          © {new Date().getFullYear()} ML SmartHub · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
