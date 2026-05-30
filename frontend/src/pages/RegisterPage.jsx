import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { TrendingUp, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { Alert } from "../components/ui/Alert";

const HIGHLIGHTS = [
  { icon: TrendingUp,   text: "Comece gratuitamente, sem cartão de crédito" },
  { icon: ShieldCheck,  text: "Dados seguros e privados — nunca compartilhados" },
  { icon: Zap,          text: "Configuração em menos de 2 minutos" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Senha deve ter pelo menos 6 caracteres");
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left: form ─────────────────────────────────────────── */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-8 lg:px-14 py-12 bg-white shrink-0">
        <div className="mb-10">
          <img src="/logo.png" alt="ML SmartHub" className="h-9 w-auto mb-10" />
          <h1 className="text-2xl font-bold text-gray-900">Crie sua conta</h1>
          <p className="text-gray-500 mt-1 text-sm">Comece gratuitamente, sem cartão de crédito</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error" onClose={() => setError("")}>{error}</Alert>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm bg-white"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm bg-white"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm bg-white"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? "Criando conta..." : <>Criar conta grátis <ArrowRight size={15} /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">
            Fazer login
          </Link>
        </p>

        <p className="mt-auto pt-10 text-xs text-gray-400 text-center">
          © {new Date().getFullYear()} ML SmartHub
        </p>
      </div>

      {/* ── Right: brand panel ─────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 flex-col justify-between p-14 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

        <div className="relative z-10">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-brand-300 mb-8">
            ML SmartHub
          </span>
          <h2 className="text-4xl font-bold leading-tight text-white mb-4">
            Tudo que você precisa<br />para vender mais
          </h2>
          <p className="text-brand-200 text-base leading-relaxed max-w-sm">
            Uma plataforma completa para gestão de vendas no Mercado Livre. Do monitoramento de preços ao analytics avançado.
          </p>
        </div>

        <div className="relative z-10 space-y-5">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
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
