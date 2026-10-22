import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { Settings, AlertTriangle, Trash2 } from "lucide-react";
import SettingsPlanSection from "../components/SettingsPlanSection";
import SettingsStoresSection from "../components/SettingsStoresSection";
import { useAuth } from "../contexts/AuthContext";
import { notifyError } from "../utils/notify";

const TABS = [
  { id: "plan", label: "Plano" },
  { id: "stores", label: "Minhas lojas" },
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
    <div className="mx-auto space-y-6">
      <div>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brandSolid-400/30 bg-brandSolid-500/10 text-brandSolid-300 shadow-[0_0_20px_-6px_rgb(30_123_255/0.7)]">
            <Settings size={19} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-fg">Configurações</h1>
            <p className="mt-1 text-sm text-fg-muted">Plano e lojas próprias.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-line/15 pb-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-brand-600 text-brandSolid-300 bg-brandSolid-500/10"
                : "border-transparent text-fg-muted hover:text-fg hover:bg-ink/[0.03]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "plan" && <SettingsPlanSection />}
      {tab === "stores" && <SettingsStoresSection />}

      {/* ─── Zona de perigo (somente owner) ──────────────────────── */}
      {isOwner && (
        <div className="border border-danger/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger" />
            <h2 className="font-semibold text-danger text-sm">Zona de perigo</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-fg">Finalizar minha conta</p>
              <p className="text-xs text-fg-muted mt-0.5">
                Remove permanentemente sua conta e todos os dados associados. Esta ação não pode ser desfeita.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-danger/80 hover:bg-danger text-white text-sm font-medium transition-colors"
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
          <div className="glass rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            {/* Cabeçalho */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-fg">Finalizar minha conta</h3>
                <p className="text-sm text-fg-muted mt-0.5">
                  Esta ação é <strong>permanente</strong> e não pode ser desfeita.
                </p>
              </div>
            </div>

            {/* Lista de dados que serão removidos */}
            <div className="rounded-xl bg-danger/10 border border-danger/30 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-danger tracking-wide">
                Dados que serão apagados permanentemente:
              </p>
              {[
                "Todos os links monitorados e histórico de preços",
                "Usuários e times criados na conta",
                "Contas conectadas (Mercado Livre)",
                "Mensagens, perguntas e templates",
                "Monitoramentos de concorrentes e alertas",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-danger">
                  <Trash2 size={12} className="mt-0.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Aviso de assinatura */}
            {user?.hasSubscription && (
              <div className="rounded-xl bg-warn/10 border border-warn/30 px-3 py-2.5 flex items-start gap-2">
                <AlertTriangle size={14} className="text-warn mt-0.5 shrink-0" />
                <p className="text-xs text-warn">
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
                className="px-4 py-2 text-sm font-medium text-fg/90 bg-ink/[0.06] hover:bg-ink/10 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-danger/80 hover:bg-danger rounded-xl transition-colors disabled:opacity-60"
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
