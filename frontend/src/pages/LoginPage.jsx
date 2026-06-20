import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Link2, BarChart2, MessageCircle, Store, ArrowRight } from "lucide-react";
import SEO from "../components/SEO";
import { Alert } from "../components/ui/Alert";

const FEATURES = [
  { icon: Link2,         text: "Monitore preços de concorrentes em tempo real" },
  { icon: BarChart2,     text: "Analytics completo de vendas e faturamento ML" },
  { icon: MessageCircle, text: "Gerencie perguntas com templates inteligentes" },
  { icon: Store,         text: "Acompanhe múltiplos sellers do Mercado Livre" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <SEO
        title="Login"
        description="Gerencie seus anúncios, preços e perguntas do Mercado Livre com o ML SmartHub."
        canonical="/login"
      />

      {/* ── Left: form ─────────────────────────────────────────── */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-8 lg:px-14 py-12 bg-white shrink-0">
        <div className="mb-10">
          <img src="/logo.png" alt="ML SmartHub" className="h-9 w-auto mb-10" />
          <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
          <p className="text-gray-500 mt-1 text-sm">Faça login na sua conta para continuar</p>
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Senha</label>
              <Link to="/forgot-password" className="text-xs text-gray-400 hover:text-brand-600 transition-colors">
                Esqueci a senha
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm bg-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? "Entrando..." : <>Entrar <ArrowRight size={15} /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Não tem uma conta?{" "}
          <Link to="/register" className="text-brand-600 font-semibold hover:underline">
            Criar conta grátis
          </Link>
        </p>

        <p className="mt-auto pt-10 text-xs text-gray-400 text-center">
          © {new Date().getFullYear()} ML SmartHub
        </p>
      </div>

      {/* ── Right: brand panel ─────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex-col justify-between p-14 text-white relative overflow-hidden">
        {/* Background grid decoration */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        {/* Glow blob */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-brand-400/30 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-brand-300 mb-8">
            ML SmartHub
          </span>
          <h2 className="text-4xl font-bold leading-tight text-white mb-4">
            Inteligência para suas<br />vendas no Mercado Livre
          </h2>
          <p className="text-brand-200 text-base leading-relaxed max-w-sm">
            Monitore concorrentes, analise seu desempenho e responda compradores — tudo em um só lugar.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Icon size={17} className="text-white" />
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
