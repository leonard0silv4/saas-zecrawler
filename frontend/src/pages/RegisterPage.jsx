import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { TrendingUp, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { Alert } from "../components/ui/Alert";
import BrandLogo from "../components/BrandLogo";
import AuthShowcase from "../components/auth/AuthShowcase";
import ThemeToggle from "../components/ThemeToggle";

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
    <div className="min-h-screen flex bg-void">

      {/* ── Left: form ─────────────────────────────────────────── */}
      <div className="relative z-10 w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-8 lg:px-14 py-12 bg-surface/70 backdrop-blur-xl shrink-0">
        <ThemeToggle className="absolute right-6 top-6" />
        <div className="mb-10">
          <BrandLogo size={34} className="mb-10" />
          <h1 className="text-2xl font-bold text-fg">Crie sua conta</h1>
          <p className="text-fg-muted mt-1 text-sm">Comece gratuitamente, sem cartão de crédito</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error" onClose={() => setError("")}>{error}</Alert>
          )}

          <div>
            <label className="block text-sm font-medium text-fg/90 mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="field w-full"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg/90 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="field w-full"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg/90 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="field w-full"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brandSolid-500 hover:bg-brandSolid-400 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-glow-brand"
          >
            {loading ? "Criando conta..." : <>Criar conta grátis <ArrowRight size={15} /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-muted">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-brandSolid-300 font-semibold hover:underline">
            Fazer login
          </Link>
        </p>

        <p className="mt-auto pt-10 text-xs text-fg-dim text-center">
          © {new Date().getFullYear()} ML SmartHub
        </p>
      </div>

      <AuthShowcase
        title={<>Tudo que você precisa<br />para vender mais</>}
        subtitle="Uma plataforma completa para gestão de vendas no Mercado Livre. Do monitoramento de preços ao analytics avançado."
        points={HIGHLIGHTS}
      />
    </div>
  );
}
