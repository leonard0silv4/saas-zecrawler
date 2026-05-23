import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import api from "../services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao processar solicitação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <div className="flex items-center justify-center">
        <div className="w-full max-w-sm">

          {sent ? (
            /* ── Estado de sucesso ── */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 mx-auto">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Email enviado!</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Se o endereço <strong>{email}</strong> estiver cadastrado,
                você receberá o link de redefinição em breve.
                Verifique também a caixa de spam.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-brand-600 font-medium hover:underline mt-2"
              >
                <ArrowLeft size={15} />
                Voltar ao login
              </Link>
            </div>
          ) : (
            /* ── Formulário ── */
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 mb-4">
                  <Mail size={22} className="text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Esqueceu a senha?</h2>
                <p className="text-gray-500 mt-1 text-sm">
                  Informe seu email e enviaremos o link de redefinição.
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
                    placeholder="seu@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
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
        </div>
      </div>
    </PublicLayout>
  );
}
