import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import PublicLayout from "../components/PublicLayout";
import SEO from "../components/SEO";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <PublicLayout>
      <SEO
        title="Gestão Inteligente para Mercado Livre"
        description="Monitore links, analise preços e gerencie seus anúncios no Mercado Livre com o ML SmartHub."
        canonical="/login"
      />
      <div className="flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h2>
            <p className="text-gray-500 mt-1 text-sm">Faça login na sua conta</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoFocus
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="text-gray-400 hover:text-brand-600 transition-colors">
                Esqueci minha senha
              </Link>
              <span className="text-gray-400">·</span>
              <Link to="/register" className="text-brand-600 font-medium hover:underline">
                Criar conta grátis
              </Link>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
