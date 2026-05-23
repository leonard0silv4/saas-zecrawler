import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import api from "../services/api";

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const token                   = searchParams.get("token") || "";

  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading]                 = useState(false);
  const [done, setDone]                       = useState(false);
  const [error, setError]                     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      return setError("Senha deve ter pelo menos 6 caracteres");
    }
    if (newPassword !== confirmPassword) {
      return setError("As senhas não coincidem");
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setDone(true);
      // Redireciona após 3s
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  }

  // Token ausente na URL
  if (!token) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mx-auto">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Link inválido</h2>
            <p className="text-sm text-gray-500">
              Este link de redefinição está incompleto ou foi corrompido.
              Solicite um novo link.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-brand-600 font-medium hover:underline"
            >
              Solicitar novo link
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="flex items-center justify-center">
        <div className="w-full max-w-sm">

          {done ? (
            /* ── Sucesso ── */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 mx-auto">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Senha atualizada!</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Sua senha foi redefinida com sucesso.
                Você será redirecionado para o login em instantes...
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-brand-600 font-medium hover:underline mt-2"
              >
                <ArrowLeft size={15} />
                Ir para o login agora
              </Link>
            </div>
          ) : (
            /* ── Formulário ── */
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 mb-4">
                  <KeyRound size={22} className="text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Nova senha</h2>
                <p className="text-gray-500 mt-1 text-sm">
                  Escolha uma nova senha para sua conta.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4"
              >
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    minLength={6}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
                    placeholder="Repita a senha"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
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
        </div>
      </div>
    </PublicLayout>
  );
}
