import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck, Lock } from "lucide-react";
import api from "../services/api";
import { Alert } from "../components/ui/Alert";
import BrandLogo from "../components/BrandLogo";
import AuthShowcase from "../components/auth/AuthShowcase";
import ThemeToggle from "../components/ThemeToggle";

const SECURITY_POINTS = [
  { icon: ShieldCheck,   text: "Use pelo menos 6 caracteres" },
  { icon: Lock,          text: "Combine letras, números e símbolos" },
  { icon: CheckCircle2,  text: "Você será redirecionado ao login automaticamente" },
];

export default function ResetPasswordPage() {
  const [searchParams]                        = useSearchParams();
  const navigate                              = useNavigate();
  const token                                 = searchParams.get("token") || "";

  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading]                 = useState(false);
  const [done, setDone]                       = useState(false);
  const [error, setError]                     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) return setError("Senha deve ter pelo menos 6 caracteres");
    if (newPassword !== confirmPassword) return setError("As senhas não coincidem");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao redefinir senha");
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

        {/* Token ausente */}
        {!token ? (
          <div className="space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-danger/10">
              <AlertCircle size={28} className="text-danger" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-fg">Link inválido</h1>
              <p className="text-fg-muted mt-1 text-sm leading-relaxed">
                Este link de redefinição está incompleto ou foi corrompido. Solicite um novo link.
              </p>
            </div>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-brandSolid-300 font-semibold hover:underline"
            >
              Solicitar novo link
            </Link>
          </div>

        ) : done ? (
          /* Sucesso */
          <div className="space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-neon/10">
              <CheckCircle2 size={28} className="text-neon" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-fg">Senha atualizada!</h1>
              <p className="text-fg-muted mt-1 text-sm leading-relaxed">
                Sua senha foi redefinida com sucesso. Você será redirecionado ao login em instantes...
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-brandSolid-300 font-semibold hover:underline"
            >
              <ArrowLeft size={15} />
              Ir para o login agora
            </Link>
          </div>

        ) : (
          /* Formulário */
          <>
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brandSolid-500/10 mb-5">
                <KeyRound size={22} className="text-brandSolid-300" />
              </div>
              <h1 className="text-2xl font-bold text-fg">Nova senha</h1>
              <p className="text-fg-muted mt-1 text-sm">Escolha uma nova senha para sua conta.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="error" onClose={() => setError("")}>{error}</Alert>
              )}

              <div>
                <label className="block text-sm font-medium text-fg/90 mb-1.5">Nova senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={6}
                  className="field w-full"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg/90 mb-1.5">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="field w-full"
                  placeholder="Repita a senha"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brandSolid-500 hover:bg-brandSolid-400 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 shadow-glow-brand"
              >
                {loading ? "Salvando..." : "Definir nova senha"}
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
        title={<>Defina sua<br />nova senha</>}
        subtitle="Escolha uma senha forte para manter sua conta protegida."
        points={SECURITY_POINTS}
      />
    </div>
  );
}
