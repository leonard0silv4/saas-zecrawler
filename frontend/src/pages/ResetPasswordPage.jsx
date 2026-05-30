import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck, Lock } from "lucide-react";
import api from "../services/api";
import { Alert } from "../components/ui/Alert";

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
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo: form ──────────────────────────────── */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-8 lg:px-14 py-12 bg-white shrink-0">
        <img src="/logo.png" alt="ML SmartHub" className="h-9 w-auto mb-10 self-start" />

        {/* Token ausente */}
        {!token ? (
          <div className="space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Link inválido</h1>
              <p className="text-gray-500 mt-1 text-sm leading-relaxed">
                Este link de redefinição está incompleto ou foi corrompido. Solicite um novo link.
              </p>
            </div>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-brand-600 font-semibold hover:underline"
            >
              Solicitar novo link
            </Link>
          </div>

        ) : done ? (
          /* Sucesso */
          <div className="space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Senha atualizada!</h1>
              <p className="text-gray-500 mt-1 text-sm leading-relaxed">
                Sua senha foi redefinida com sucesso. Você será redirecionado ao login em instantes...
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-brand-600 font-semibold hover:underline"
            >
              <ArrowLeft size={15} />
              Ir para o login agora
            </Link>
          </div>

        ) : (
          /* Formulário */
          <>
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 mb-5">
                <KeyRound size={22} className="text-brand-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Nova senha</h1>
              <p className="text-gray-500 mt-1 text-sm">Escolha uma nova senha para sua conta.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="error" onClose={() => setError("")}>{error}</Alert>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={6}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm bg-white"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm bg-white"
                  placeholder="Repita a senha"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Definir nova senha"}
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
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-600 to-brand-800 flex-col justify-between p-14 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-brand-300 mb-8">
            ML SmartHub
          </span>
          <h2 className="text-4xl font-bold leading-tight text-white mb-4">
            Defina sua<br />nova senha
          </h2>
          <p className="text-brand-200 text-base leading-relaxed max-w-sm">
            Escolha uma senha forte para manter sua conta protegida.
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
