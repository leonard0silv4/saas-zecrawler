import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { Settings, AlertTriangle, Trash2 } from "lucide-react";
import SettingsPlanSection from "../components/SettingsPlanSection";
import SettingsStoresSection from "../components/SettingsStoresSection";
import SettingsCookiesSection from "../components/SettingsCookiesSection";
import { useAuth } from "../contexts/AuthContext";
import { notifyError } from "../utils/notify";

const TABS = [
  { id: "plan", label: "Plano" },
  { id: "stores", label: "Minhas lojas" },
  { id: "cookies", label: "Cookies ML" },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initial = TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : "plan";
  const [tab, setTab] = useState(initial);
  const { user, deleteAccount, isOwner } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (TABS.some((t) => t.id === tabFromUrl)) {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
      // AuthContext limpa localStorage e seta user=null → ProtectedRoute redireciona para /login
    } catch {
      notifyError("Erro ao encerrar conta. Tente novamente.");
      setDeleting(false);
    }
  }

  function selectTab(id) {
    setTab(id);
    const next = new URLSearchParams(searchParams);
    if (id === "plan") {
      next.delete("tab");
    } else {
      next.set("tab", id);
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-brand-50 text-brand-700">
          <Settings size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configurações</h1>
          <p className="text-gray-600 text-sm mt-0.5">Plano, lojas próprias e cookies do Mercado Livre.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-brand-600 text-brand-700 bg-brand-50/50"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "plan" && <SettingsPlanSection />}
      {tab === "stores" && <SettingsStoresSection />}
      {tab === "cookies" && <SettingsCookiesSection />}

      {/* ─── Zona de perigo (somente owner) ──────────────────────── */}
      {isOwner && (
        <div className="border border-red-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="font-semibold text-red-700 text-sm">Zona de perigo</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Finalizar minha conta</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Remove permanentemente sua conta e todos os dados associados. Esta ação não pode ser desfeita.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
            >
              <Trash2 size={15} />
              Finalizar minha conta
            </button>
          </div>
        </div>
      )}

      {/* ─── Modal de confirmação ─────────────────────────────────── */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            {/* Cabeçalho */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Finalizar minha conta</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Esta ação é <strong>permanente</strong> e não pode ser desfeita.
                </p>
              </div>
            </div>

            {/* Lista de dados que serão removidos */}
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-red-800 uppercase tracking-wide">
                Dados que serão apagados permanentemente:
              </p>
              {[
                "Todos os links monitorados e histórico de preços",
                "Usuários e times criados na conta",
                "Contas conectadas (Mercado Livre)",
                "Mensagens, perguntas e templates",
                "Monitoramentos de concorrentes e alertas",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-red-700">
                  <Trash2 size={12} className="mt-0.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Aviso de assinatura */}
            {user?.hasSubscription && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  Sua assinatura ativa será <strong>cancelada automaticamente</strong>.
                  Você não será cobrado na próxima recorrência.
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60"
              >
                <Trash2 size={14} />
                {deleting ? "Encerrando..." : "Finalizar conta"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
