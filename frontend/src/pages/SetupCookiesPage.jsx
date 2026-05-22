import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cookie,
  Save,
  LogIn,
  Download,
  ClipboardPaste,
} from "lucide-react";
import api from "../services/api";
import { useNotifications } from "../contexts/NotificationContext";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/hlkenndednhfkekhgcdicdfddnkalmdm";
const ML_URL = "https://www.mercadolivre.com.br";

function normalizePayload(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.cookies)) return parsed.cookies;
  return null;
}

function Step({ number, icon: Icon, title, children, done }) {
  return (
    <div className="flex gap-4">
      {/* Indicador numérico */}
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
            done
              ? "bg-emerald-500 text-white"
              : "bg-brand-100 text-brand-700"
          }`}
        >
          {done ? <CheckCircle2 size={18} /> : number}
        </div>
        <div className="w-px flex-1 mt-2 bg-gray-200" />
      </div>

      {/* Conteúdo */}
      <div className="pb-8 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={18} className="text-brand-600 shrink-0" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SetupCookiesPage() {
  const navigate = useNavigate();
  const { refreshCookieStatus } = useNotifications();

  const [jsonText, setJsonText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setError(null);
    let parsed;
    try {
      parsed = JSON.parse(jsonText.trim() || "[]");
    } catch {
      setError("JSON inválido. Verifique vírgulas e aspas.");
      return;
    }
    const cookies = normalizePayload(parsed);
    if (!cookies) {
      setError('Envie um array de cookies ou um objeto { "cookies": [...] }.');
      return;
    }
    if (!cookies.length) {
      setError("O array de cookies está vazio.");
      return;
    }
    const invalid = cookies.some(
      (c) => !c || typeof c.name !== "string" || typeof c.value !== "string"
    );
    if (invalid) {
      setError("Cada item precisa ter pelo menos name e value (string).");
      return;
    }

    setSaving(true);
    try {
      await api.post("/cookies", { cookies });
      setSuccess(true);
      refreshCookieStatus();
      setTimeout(() => navigate("/dashboard"), 1800);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Erro ao salvar cookies");
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Cookies configurados!</h2>
        <p className="text-gray-500 text-sm">Redirecionando para o dashboard…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Cookie size={20} className="text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configurar cookies do Mercado Livre
          </h1>
        </div>
        <p className="text-gray-500 text-sm">
          Os crawlers precisam dos seus cookies de sessão para funcionar corretamente.
          Siga os passos abaixo — leva menos de 2 minutos.
        </p>
      </div>

      {/* Steps */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">

        {/* Passo 1 */}
        <Step number={1} icon={Download} title="Instale o plugin Cookie-Editor no Chrome">
          <p className="text-sm text-gray-600 mb-3">
            O Cookie-Editor é uma extensão gratuita que permite exportar seus cookies do
            navegador em formato JSON.
          </p>
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <ExternalLink size={14} />
            Instalar Cookie-Editor na Chrome Web Store
          </a>
          <p className="text-xs text-gray-400 mt-2">
            Já tem instalado? Pule para o próximo passo.
          </p>
        </Step>

        {/* Passo 2 */}
        <Step number={2} icon={LogIn} title="Entre na sua conta do Mercado Livre">
          <p className="text-sm text-gray-600 mb-3">
            Abra o Mercado Livre em uma nova aba e certifique-se de que está{" "}
            <strong>logado na sua conta de vendedor</strong>.
          </p>

          {/* Aviso destacado */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 mb-3 text-amber-800 text-sm">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <span>
              <strong>Importante:</strong> você precisa estar{" "}
              <strong>logado</strong> no Mercado Livre antes de exportar os
              cookies. Não basta apenas abrir o site — sem login, os cookies não
              terão os dados de autenticação e os crawlers não funcionarão.
            </span>
          </div>

          <a
            href={ML_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={14} />
            Abrir Mercado Livre
          </a>
        </Step>

        {/* Passo 3 */}
        <Step number={3} icon={Cookie} title="Exporte os cookies com o plugin">
          <p className="text-sm text-gray-600 mb-3">
            Com o Mercado Livre aberto e você logado:
          </p>
          <ol className="space-y-2 text-sm text-gray-700 list-none">
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-bold mt-0.5">1</span>
              <span>
                Clique no ícone do <strong>Cookie-Editor</strong> na barra de
                ferramentas do Chrome (ao lado da barra de endereços — ícone de
                cookie laranja/colorido). Se não aparecer, clique no ícone de
                extensões <code className="bg-gray-100 px-1 rounded text-xs">⋮</code> e
                fixe o Cookie-Editor.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-bold mt-0.5">2</span>
              <span>
                No popup que abrir, clique no botão{" "}
                <strong className="bg-gray-900 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                  Export
                </strong>{" "}
                no canto inferior direito.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-bold mt-0.5">3</span>
              <span>
                Selecione <strong>JSON</strong> — o conteúdo é copiado
                automaticamente para a área de transferência.
              </span>
            </li>
          </ol>
        </Step>

        {/* Passo 4 */}
        <Step number={4} icon={ClipboardPaste} title="Cole os cookies aqui e salve">
          <p className="text-sm text-gray-600 mb-3">
            Cole o JSON copiado no campo abaixo e clique em{" "}
            <strong>Salvar e concluir</strong>.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 text-red-800 text-sm px-3 py-2 mb-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='[ { "domain": ".mercadolivre.com.br", "name": "ssid", "value": "...", ... }, ... ]'
            rows={8}
            className="w-full font-mono text-xs border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y min-h-[140px] mb-3"
            spellCheck={false}
          />

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !jsonText.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            {saving ? "Salvando…" : "Salvar e concluir"}
          </button>

          <p className="text-xs text-gray-400 mt-3">
            Ao salvar, os cookies anteriores desta conta são substituídos. Não
            compartilhe este JSON com ninguém.
          </p>
        </Step>
      </div>
    </div>
  );
}
