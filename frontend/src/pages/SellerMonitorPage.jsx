import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { Bell, Loader2, Pencil, Plus, RefreshCw, Store, Trash2, Play } from "lucide-react";
import api from "../services/api";
import { notifyError, notifyWarning } from "../utils/notify.js";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { CatalogScanPanel } from "../components/seller-monitor/CatalogScanPanel";
import { AddSellerModal } from "../components/seller-monitor/AddSellerModal";
import { PageHeader } from "../components/ui";
import { Radar } from "../components/fx";

const QK = {
  sellers: () => ["seller-monitor"],
  products: (id) => ["seller-products", id],
  alerts: (id) => ["seller-alerts", id],
};


function fmtAgo(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d) / 1000);
  if (sec < 60) return "agora";
  if (sec < 3600) return `há ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `há ${Math.floor(sec / 3600)} h`;
  return d.toLocaleDateString("pt-BR");
}

export default function SellerMonitorPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("products");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSeller, setEditSeller] = useState(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const { data: sellers = [], isLoading: loading } = useQuery({
    queryKey: QK.sellers(),
    queryFn: () => api.get("/seller-monitor").then(r => r.data),
    refetchInterval: (query) => query.state.data?.some(s => s.scraping) ? 4000 : 30000,
  });

  const { data: products = [], isLoading: loadingDetail } = useQuery({
    queryKey: QK.products(selectedId),
    queryFn: () => api.get(`/seller-monitor/${selectedId}/products`).then(r => r.data),
    enabled: !!selectedId,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: QK.alerts(selectedId),
    queryFn: () => api.get(`/seller-monitor/${selectedId}/alerts`).then(r => r.data),
    enabled: !!selectedId,
  });

  function selectSeller(s) {
    setSelectedId(s._id);
    setTab("products");
  }

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: QK.sellers() });
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: QK.products(selectedId) });
      queryClient.invalidateQueries({ queryKey: QK.alerts(selectedId) });
    }
  }

  async function handleRun(s) {
    try {
      await api.post(`/seller-monitor/${s._id}/run`);
      queryClient.invalidateQueries({ queryKey: QK.sellers() });
    } catch (err) {
      if (err.response?.status === 409) notifyWarning("Atualização já em andamento");
      else notifyError("Erro ao iniciar");
    }
  }

  function openEditSeller(s) {
    setEditSeller(s);
    setEditName(s.name || "");
    setEditUrl(s.url || "");
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editSeller) return;
    setEditSaving(true);
    try {
      await api.put(`/seller-monitor/${editSeller._id}`, {
        name: editName.trim(),
        url: editUrl.trim(),
      });
      queryClient.invalidateQueries({ queryKey: QK.sellers() });
      if (selectedId === editSeller._id) {
        queryClient.invalidateQueries({ queryKey: QK.products(selectedId) });
        queryClient.invalidateQueries({ queryKey: QK.alerts(selectedId) });
      }
      setEditOpen(false);
      setEditSeller(null);
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao editar seller");
    } finally {
      setEditSaving(false);
    }
  }

  function handleDelete(s) {
    setConfirmDialog({
      title: "Remover seller",
      message: `Remover "${s.name || s.url}" e todos os dados associados? Esta ação não pode ser desfeita.`,
      confirmLabel: "Remover",
      onConfirm: async () => {
        await api.delete(`/seller-monitor/${s._id}`);
        setConfirmDialog(null);
        if (selectedId === s._id) setSelectedId(null);
        queryClient.invalidateQueries({ queryKey: QK.sellers() });
      },
    });
  }

  async function markRead(aid) {
    await api.put(`/seller-monitor/alerts/${aid}/read`);
    queryClient.invalidateQueries({ queryKey: QK.alerts(selectedId) });
  }

  async function markAllRead() {
    if (!selectedId) return;
    await api.put(`/seller-monitor/${selectedId}/alerts/read-all`);
    queryClient.invalidateQueries({ queryKey: QK.alerts(selectedId) });
  }

  const selected = sellers.find((s) => s._id === selectedId);
  const unread = sellers.reduce((acc, s) => acc + (s.unreadAlerts || 0), 0);
  const maxSellerMonitors = user?.planConfig?.maxSellerMonitors ?? 0;
  const canAddSeller = sellers.length < maxSellerMonitors;

  return (
    <div className="space-y-4 mx-auto max-w-[1400px]">
      {/* Header */}
      <PageHeader
        icon={Store}
        title="Monitor de Sellers"
        description="Monitore preços de concorrentes nos produtos de catálogo do Mercado Livre."
        className="!mb-2"
      />

      <CatalogScanPanel onScanFinished={refreshAll} />

      <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-12rem)]">
      <aside className="lg:w-72 shrink-0 glass rounded-xl border border-line/10 flex flex-col max-h-[40vh] lg:sticky lg:top-0 lg:self-start lg:h-[calc(100vh-4rem)] lg:max-h-none">
        <div className="p-3 border-b border-line/10 flex items-center justify-between">
          <div>
            <span className="font-semibold text-fg flex items-center gap-2">
              <Store size={18} className="text-brandSolid-300" />
              Sellers
              {unread > 0 && (
                <span className="text-xs bg-danger/20 text-danger ring-1 ring-inset ring-danger/40 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-[0_0_10px_-2px_rgb(var(--danger)/0.7)]">
                  <Bell size={10} /> {unread}
                </span>
              )}
            </span>
            <p className="text-xs text-fg-muted mt-0.5">
              {sellers.length} de {maxSellerMonitors} utilizados
            </p>
          </div>
          <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: QK.sellers() })} className="p-1.5 text-fg-muted hover:bg-ink/[0.03] rounded-lg">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-fg-dim" />
            </div>
          ) : sellers.length === 0 ? (
            <p className="text-sm text-fg-muted p-3">Nenhum seller. Cadastre um.</p>
          ) : (
            sellers.map((s) => (
              <div
                key={s._id}
                className={`rounded-lg border p-2 text-sm cursor-pointer transition-colors ${
                  selectedId === s._id ? "border-brand-500 bg-brandSolid-500/10" : "border-line/10 hover:bg-ink/[0.03]"
                }`}
                onClick={() => selectSeller(s)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-fg truncate">{s.name || s.nickname || "Sem nome"}</span>
                  {s.noData && !s.scraping && (
                    <span
                      title="Vendedor não encontrado nos catálogos varridos. Adicione categorias ou links de catálogo em que ele vende."
                      className="shrink-0 text-[10px] font-medium bg-warn/10 text-warn border border-warn/30 px-1.5 py-0.5 rounded">
                      Sem dados
                    </span>
                  )}
                </div>
                <div className="text-xs text-fg-muted truncate">{s.url}</div>
                <div className="flex items-center justify-between mt-2 gap-1">
                  <span className="text-xs text-fg-muted">
                    {s.scraping ? "Atualizando…" : `${s.totalProducts || 0} itens · ${fmtAgo(s.lastRunAt)}`}
                  </span>
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleRun(s)}
                      className="p-1 text-brandSolid-300 hover:bg-brandSolid-500/15 rounded"
                      title="Atualizar"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditSeller(s)}
                      className="p-1 text-brandSolid-300 hover:bg-brandSolid-500/15 rounded"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      className="p-1 text-danger hover:bg-danger/10 rounded"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={!canAddSeller}
          className="m-2 flex items-center justify-center gap-2 py-2 rounded-lg bg-brandSolid-500 text-white text-sm font-medium hover:bg-brandSolid-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-brand"
        >
          <Plus size={16} /> Novo seller
        </button>
        {!canAddSeller && (
          <p className="px-3 pb-3 text-xs text-warn">
            Você atingiu o limite do seu plano para sellers monitorados.
          </p>
        )}
      </aside>

      <main className="flex-1 glass rounded-xl border border-line/10 flex flex-col min-h-[320px]">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-fg-muted p-8">
            <Radar size={150} className="mb-6" />
            <p className="font-medium text-fg">Selecione um seller</p>
            <p className="text-sm text-center mt-1 max-w-md">
              Os produtos de cada seller vêm dos catálogos varridos (seus anúncios, seus Links e os mais vendidos das
              categorias escolhidas). Requer conta ML conectada.
            </p>
          </div>
        ) : (
          <>
            <div className="border-b border-line/10 px-4 py-3">
              <h2 className="font-semibold text-fg">{selected?.name || "Seller"}</h2>
              <p className="text-xs text-fg-muted truncate">{selected?.url}</p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setTab("products")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    tab === "products" ? "bg-brandSolid-500/15 text-brandSolid-300" : "text-fg-muted"
                  }`}
                >
                  Produtos ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("alerts")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    tab === "alerts" ? "bg-brandSolid-500/15 text-brandSolid-300" : "text-fg-muted"
                  }`}
                >
                  Alertas ({alerts.filter((a) => !a.read).length} novos)
                </button>
                {tab === "alerts" && alerts.some((a) => !a.read) && (
                  <button type="button" onClick={markAllRead} className="text-xs text-brandSolid-300 ml-auto">
                    Marcar todos lidos
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {tab === "products" && (
                <>
                  {loadingDetail ? (
                    <Loader2 className="animate-spin text-fg-dim mx-auto block mt-8" />
                  ) : (
                    <ul className="space-y-2">
                      {products.map((p) => (
                        <li key={p._id} className="flex gap-3 text-sm border border-line/10 rounded-lg p-2">
                          {p.image && <img src={p.image} alt="" className="w-14 h-14 object-cover rounded bg-ink/[0.06]" />}
                          <div className="min-w-0 flex-1">
                            <a href={p.url} target="_blank" rel="noreferrer" className="font-medium text-fg hover:text-brandSolid-300 line-clamp-2">
                              {p.name}
                            </a>
                            <div className="text-neon font-semibold mt-1">R$ {Number(p.currentPrice).toFixed(2)}</div>
                            {(p.isNew || p.priceChanged) && (
                              <span className="text-[10px] text-warn bg-warn/10 px-1 rounded">
                                {p.isNew ? "Novo" : ""}
                                {p.priceChanged ? "Preço alterado" : ""}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!loadingDetail && products.length === 0 && (
                    <p className="text-fg-muted text-sm text-center py-8">
                      {selected?.noData
                        ? "Este vendedor não apareceu nos catálogos varridos. Adicione categorias ou links de catálogo em que ele vende e rode a varredura."
                        : "Nenhum produto ainda. Aguarde a varredura ou clique em atualizar."}
                    </p>
                  )}
                </>
              )}
              {tab === "alerts" && (
                <ul className="space-y-2">
                  {alerts.map((a) => (
                    <li
                      key={a._id}
                      className={`text-sm border rounded-lg p-3 ${a.read ? "border-line/10 bg-ink/[0.03]" : "border-warn/30 bg-warn/10"}`}
                    >
                      <div className="font-medium">{format(a.createdAt, "dd/MM/yy - ")} {a.type === "new_product" ? "Produto novo" : "Mudança de preço"}
                        

                      </div>
                      <a href={a.productUrl} target="_blank" rel="noreferrer" className="text-brandSolid-300 text-xs line-clamp-2">
                        {a.productName} 
                      </a>
                      
                      {a.type === "price_change" && (
                        <div className="text-xs text-fg-muted mt-1">
                          R$ {a.oldPrice?.toFixed(2)} → R$ {a.newPrice?.toFixed(2)}
                        </div>
                      )}
                      {!a.read && (
                        <button type="button" onClick={() => markRead(a._id)} className="text-xs text-brandSolid-300 mt-2">
                          Marcar lido
                        </button>
                      )}
                    </li>
                  ))}
                  {alerts.length === 0 && <p className="text-fg-muted text-sm text-center py-8">Sem alertas.</p>}
                </ul>
              )}
            </div>
          </>
        )}
      </main>

      {editOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/70 backdrop-blur-md p-4" onClick={() => setEditOpen(false)}>
          <div
            className="glass glow-top !bg-surface-2/95 rounded-2xl p-6 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg">Editar seller</h3>
            <div>
              <label className="text-sm text-fg-muted">Nome</label>
              <input
                className="field w-full mt-1"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do seller"
              />
            </div>
            <div>
              <label className="text-sm text-fg-muted">Página do vendedor</label>
              <input
                className="field w-full mt-1"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://lista.mercadolivre.com.br/..."
              />
              {editUrl.trim() !== (editSeller?.url || "") && (
                <p className="text-xs text-warn mt-1">
                  ⚠️ Alterar a URL irá apagar todos os produtos e alertas deste seller e reiniciar a busca.
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" className="px-4 py-2 text-sm text-fg-muted" onClick={() => setEditOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={handleEditSave}
                className="px-4 py-2 rounded-lg bg-brandSolid-500 text-white text-sm font-medium disabled:opacity-50 shadow-glow-brand"
              >
                {editSaving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <AddSellerModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => queryClient.invalidateQueries({ queryKey: QK.sellers() })}
      />
      </div>

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={confirmDialog?.onConfirm}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  );
}
