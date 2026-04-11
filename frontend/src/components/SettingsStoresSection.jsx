import { useEffect, useState } from "react";
import { Store, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function SettingsStoresSection() {
  const { user } = useAuth();
  const canEdit = user?.role === "owner" || user?.role === "admin";
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/settings")
      .then(({ data }) => {
        if (cancelled) return;
        const lines = (data.mySellerNames || []).join("\n");
        setText(lines);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar as lojas.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!canEdit) return;
    setError(null);
    setMessage(null);
    const names = text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      await api.put("/settings", { mySellerNames: names });
      setMessage("Nomes das lojas salvos. A análise de preços usa esta lista (ou o padrão do ambiente se vazia).");
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Store size={20} className="text-brand-600" />
          Minhas lojas (vendedores próprios)
        </h2>
        <p className="text-gray-600 mt-1 text-sm">
          Nomes exatamente como aparecem no XML / coluna vendedor (um por linha ou separados por vírgula). Usados para
          marcar “sua loja” na análise de preços.
        </p>
      </div>

      {!canEdit && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Apenas owner ou admin podem alterar esta lista.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 text-red-800 text-sm px-3 py-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 text-emerald-800 text-sm px-3 py-2">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading || !canEdit}
        placeholder="MINHA_LOJA_1&#10;MINHA_LOJA_2"
        rows={8}
        className="w-full font-mono text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y disabled:bg-gray-50 disabled:text-gray-500"
        spellCheck={false}
      />

      {canEdit && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? "Salvando…" : "Salvar lojas"}
        </button>
      )}
    </div>
  );
}
