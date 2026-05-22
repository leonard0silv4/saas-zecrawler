import { useCallback, useEffect, useState } from "react";
import { Cookie, Trash2, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../services/api";
import { useNotifications } from "../contexts/NotificationContext";

function normalizePayload(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.cookies)) return parsed.cookies;
  return null;
}

export default function SettingsCookiesSection() {
  const { refreshCookieStatus } = useNotifications();
  const [jsonText, setJsonText] = useState("");
  const [savedCount, setSavedCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const loadCount = useCallback(async () => {
    try {
      const { data } = await api.get("/cookies");
      setSavedCount(Array.isArray(data) ? data.length : 0);
    } catch {
      setSavedCount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  async function handleSave() {
    setError(null);
    setMessage(null);
    let parsed;
    try {
      parsed = JSON.parse(jsonText.trim() || "[]");
    } catch {
      setError("JSON inválido. Verifique vírgulas e aspas.");
      return;
    }
    const cookies = normalizePayload(parsed);
    if (!cookies) {
      setError("Envie um array de cookies ou um objeto { \"cookies\": [...] }.");
      return;
    }
    if (!cookies.length) {
      setError("O array de cookies está vazio.");
      return;
    }
    const invalid = cookies.some((c) => !c || typeof c.name !== "string" || typeof c.value !== "string");
    if (invalid) {
      setError("Cada item precisa ter pelo menos name e value (string).");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post("/cookies", { cookies });
      setMessage(`Salvos ${data.inserted} cookie(s).${data.skipped ? ` Ignorados: ${data.skipped}.` : ""}`);
      setJsonText("");
      await loadCount();
      refreshCookieStatus(); // atualiza o banner no AppLayout
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!window.confirm("Remover todos os cookies ML salvos para sua conta?")) return;
    setClearing(true);
    setError(null);
    setMessage(null);
    try {
      await api.delete("/cookies");
      setMessage("Cookies removidos.");
      await loadCount();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Erro ao limpar");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Cookies Mercado Livre</h2>
        <p className="text-gray-600 mt-1 text-sm leading-relaxed">
          JSON exportado da extensão do navegador (<code className="text-xs bg-gray-100 px-1 rounded">domain</code>,{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">name</code>,{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">value</code>, etc.). Usado em análise de preços e monitor
          de sellers.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-2 text-gray-700">
          <Cookie size={18} className="text-brand-600" />
          {loading ? "Carregando…" : `Cookies salvos: ${savedCount ?? "—"}`}
        </span>
      </div>

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

      <label className="block text-sm font-medium text-gray-700">JSON</label>
      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder='[ { "domain": ".mercadolivre.com.br", "name": "ssid", "value": "...", ... }, ... ]'
        rows={12}
        className="w-full font-mono text-xs border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y min-h-[180px]"
        spellCheck={false}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? "Salvando…" : "Salvar cookies"}
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={clearing || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <Trash2 size={18} />
          {clearing ? "Limpando…" : "Limpar todos"}
        </button>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Ao salvar, os cookies anteriores desta conta são substituídos. Não compartilhe este JSON.
      </p>
    </div>
  );
}
