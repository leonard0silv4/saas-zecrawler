import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Link2, BarChart2, MessageCircle, ArrowRight } from "lucide-react";
import SEO from "../components/SEO";
import { Alert } from "../components/ui/Alert";
import BrandLogo from "../components/BrandLogo";
import AuthShowcase from "../components/auth/AuthShowcase";
import ThemeToggle from "../components/ThemeToggle";

const FEATURES = [
  { icon: Link2,         text: "Monitore preços de concorrentes em tempo real" },
  { icon: BarChart2,     text: "Analytics completo de vendas e faturamento ML" },
  { icon: MessageCircle, text: "Gerencie perguntas com templates inteligentes" },
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
    <div className="min-h-screen flex bg-void">
      <SEO
        title="Login"
        description="Gerencie seus anúncios, preços e perguntas do Mercado Livre com o ML SmartHub."
        canonical="/login"
      />

      {/* ── Left: form ─────────────────────────────────────────── */}
      <div className="relative z-10 w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-8 lg:px-14 py-12 bg-surface/70 backdrop-blur-xl shrink-0">
        <ThemeToggle className="absolute right-6 top-6" />
        <div className="mb-10">
          <BrandLogo size={34} className="mb-10" />
          <h1 className="text-2xl font-bold text-fg">Bem-vindo de volta</h1>
          <p className="text-fg-muted mt-1 text-sm">Faça login na sua conta para continuar</p>
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-fg/90">Senha</label>
              <Link to="/forgot-password" className="text-xs text-fg-dim hover:text-brandSolid-300 transition-colors">
                Esqueci a senha
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="field w-full"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brandSolid-500 hover:bg-brandSolid-400 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-glow-brand"
          >
            {loading ? "Entrando..." : <>Entrar <ArrowRight size={15} /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-muted">
          Não tem uma conta?{" "}
          <Link to="/register" className="text-brandSolid-300 font-semibold hover:underline">
            Criar conta grátis
          </Link>
        </p>

        <p className="mt-auto pt-10 text-xs text-fg-dim text-center">
          © {new Date().getFullYear()} ML SmartHub
        </p>
      </div>

      <AuthShowcase
        title={<>Inteligência para suas<br />vendas no Mercado Livre</>}
        subtitle="Monitore concorrentes, analise seu desempenho e responda compradores — tudo em um só lugar."
        points={FEATURES}
      />
    </div>
  );
}
