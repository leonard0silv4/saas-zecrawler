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
    <div className="glass rounded-xl border border-line/15 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
          <Store size={20} className="text-brandSolid-300" />
          Minhas lojas (vendedores próprios)
        </h2>
        <p className="text-fg-muted mt-1 text-sm">
          Nomes exatamente como aparecem no XML / coluna vendedor (um por linha ou separados por vírgula). Usados para
          marcar “sua loja” na análise de preços.
        </p>
      </div>

      {!canEdit && (
        <p className="text-sm text-warn bg-warn/10 border border-warn/30 rounded-lg px-3 py-2">
          Apenas owner ou admin podem alterar esta lista.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-danger/10 text-danger text-sm px-3 py-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="flex items-start gap-2 rounded-lg bg-neon/10 text-neon text-sm px-3 py-2">
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
        className="field w-full disabled:bg-ink/[0.03] disabled:text-fg-muted"
        spellCheck={false}
      />

      {canEdit && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brandSolid-500 text-white text-sm font-medium hover:bg-brandSolid-400 disabled:opacity-50 shadow-glow-brand"
        >
          <Save size={18} />
          {saving ? "Salvando…" : "Salvar lojas"}
        </button>
      )}
    </div>
  );
}
