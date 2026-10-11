import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Package, Truck, Unlink, Unplug } from "lucide-react";
import api from "../services/api";
import { notifyError, notifyWarning } from "../utils/notify.js";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

export default function MeliPage() {
  const { isOwner, user } = useAuth();
  const { refreshMeliAccountStatus } = useNotifications();
  const maxMeliAccounts = user?.planConfig?.maxMeliAccounts ?? 0;
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingProd, setLoadingProd] = useState(false);
  const [shipmentId, setShipmentId] = useState("");
  const [shipment, setShipment] = useState(null);
  const [loadingShip, setLoadingShip] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  async function loadAccounts() {
    setLoading(true);
    try {
      const { data } = await api.get("/meli/accounts");
      setAccounts(data);
      if (data.length && !userId) setUserId(String(data[0].user_id));
    } catch {
      notifyError("Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function connectAccount() {
    const token = localStorage.getItem("token");
    window.location.href = `/api/meli/auth?token=${encodeURIComponent(token)}`;
  }

  function disconnectAccount(mlUserId) {
    const acc = accounts.find((a) => String(a.user_id) === String(mlUserId));
    const label = acc?.nickname || `ID ${mlUserId}`;
    setConfirmDialog({
      title: "Desconectar conta",
      message: `Desconectar "${label}"? Os tokens serão removidos deste app. Perguntas e produtos em cache dessa loja serão apagados. Para usar de novo, conecte e autorize no Mercado Livre.`,
      confirmLabel: "Desconectar",
      onConfirm: async () => {
        setDisconnectingId(mlUserId);
        setConfirmDialog(null);
        try {
          await api.delete(`/meli/accounts/${mlUserId}`);
          if (String(userId) === String(mlUserId)) {
            setUserId("");
            setProducts([]);
          }
          await loadAccounts();
          refreshMeliAccountStatus();
        } catch (err) {
          notifyError(err.response?.data?.error || "Erro ao desconectar");
        } finally {
          setDisconnectingId(null);
        }
      },
    });
  }

  async function loadProducts() {
    if (!userId) return;
    setLoadingProd(true);
    try {
      const { data } = await api.get("/meli/products", { params: { user_id: userId } });
      setProducts(data);
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao listar produtos");
      setProducts([]);
    } finally {
      setLoadingProd(false);
    }
  }

  async function loadShipment() {
    const id = shipmentId.trim();
    if (!id || !/^\d+$/.test(id)) {
      notifyWarning("Informe um ID numérico de envio");
      return;
    }
    setLoadingShip(true);
    setShipment(null);
    try {
      const { data } = await api.get(`/meli/shipment/${id}`);
      setShipment(data);
    } catch (err) {
      notifyError(err.response?.data?.error || "Envio não encontrado");
    } finally {
      setLoadingShip(false);
    }
  }

  return (
    <div className="space-y-6 mx-auto">
      <div>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brandSolid-400/30 bg-brandSolid-500/10 text-brandSolid-300 shadow-[0_0_20px_-6px_rgb(30_123_255/0.7)]">
            <Unplug size={19} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-fg">Contas conectadas</h1>
            <p className="mt-1 text-sm text-fg-muted">Conecte contas OAuth e consulte produtos indexados.</p>
          </div>
        </div>
      </div>

      <section className="glass rounded-xl border border-line/10 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-fg">Contas conectadas</h2>
            {maxMeliAccounts > 0 && (
              <p className="text-xs text-fg-muted mt-0.5">
                {accounts.length} de {maxMeliAccounts} {maxMeliAccounts === 1 ? "conta utilizada" : "contas utilizadas"}
              </p>
            )}
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={connectAccount}
              className="px-4 py-2 rounded-lg bg-[#ffe600] hover:bg-[#fff159] text-[#2d3277] text-sm font-semibold shadow-[0_0_20px_-6px_rgb(255_230_0/0.8)]"
            >
              Conectar nova conta
            </button>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-fg-muted">Carregando…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-fg-muted">Nenhuma conta. Use o botão acima e autorize no Mercado Livre.</p>
        ) : (
          <ul className="divide-y divide-line/[0.07] border border-line/10 rounded-xl bg-ink/[0.02]">
            {accounts.map((a) => (
              <li key={a.user_id} className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between text-sm">
                <div className="min-w-0 flex-1 flex items-center gap-3">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brandSolid-400/30 bg-brandSolid-500/10 text-xs font-semibold text-brandSolid-300">
                    {(a.nickname || "?").slice(0, 2).toUpperCase()}
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-neon ring-2 ring-[rgb(var(--surface))] shadow-[0_0_6px_rgb(var(--neon))]" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-fg truncate">{a.nickname || `User ${a.user_id}`}</p>
                    <p className="text-fg-dim text-xs num">ID {a.user_id}</p>
                  </div>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => disconnectAccount(a.user_id)}
                    disabled={disconnectingId !== null}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/30 text-danger text-xs font-medium hover:bg-danger/10 disabled:opacity-50"
                  >
                    <Unlink size={14} />
                    {disconnectingId === a.user_id ? "Desconectando…" : "Desconectar"}
                  </button>
                )}
                {a.authError && (
                  <div className="w-full mt-1 flex items-center gap-2 bg-warn/10 border border-warn/30 rounded-lg px-3 py-2 text-xs text-warn">
                    <AlertTriangle size={14} className="shrink-0 text-warn" />
                    <span className="flex-1">
                      Autorização expirada ou sem permissão. Reconecte para restaurar a sincronização de pedidos.
                    </span>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={connectAccount}
                        className="shrink-0 px-2.5 py-1 rounded-md bg-yellow-400 hover:bg-yellow-500 text-fg font-medium"
                      >
                        Reconectar
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass rounded-xl border border-line/10 p-6 space-y-4">
        <h2 className="font-semibold text-fg flex items-center gap-2">
          <Package size={18} />
          Produtos 
        </h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-fg-muted block mb-1">Conta </label>
            <select
              className="field min-w-[200px]"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.nickname || a.user_id}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={loadProducts}
            disabled={loadingProd || !userId}
            className="px-4 py-2 rounded-lg bg-brandSolid-500 text-white text-sm font-medium disabled:opacity-50 shadow-glow-brand"
          >
            {loadingProd ? "Carregando…" : "Listar"}
          </button>
        </div>
        {products.length > 0 && (
          <div className="max-h-72 overflow-y-auto border border-line/10 rounded-lg text-sm">
            {products.slice(0, 50).map((p) => (
              <div key={p._id || p.id} className="px-3 py-2 border-b border-line/[0.06] flex justify-between gap-2">
                <span className="truncate flex-1">{p.title || p.SKU}</span>
                {p.permalink && (
                  <a href={p.permalink} target="_blank" rel="noreferrer" className="text-brandSolid-300 shrink-0">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))}
            {products.length > 50 && <p className="text-xs text-fg-muted p-2">Mostrando 50 de {products.length}</p>}
          </div>
        )}
      </section>

      <section className="glass rounded-xl border border-line/10 p-6 space-y-4 hidden">
        <h2 className="font-semibold text-fg flex items-center gap-2">
          <Truck size={18} />
          Consultar envio
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="field flex-1 min-w-[160px]"
            placeholder="ID do shipment (apenas números)"
            value={shipmentId}
            onChange={(e) => setShipmentId(e.target.value)}
          />
          <button
            type="button"
            onClick={loadShipment}
            disabled={loadingShip}
            className="px-4 py-2 rounded-lg bg-brandSolid-500 hover:bg-brandSolid-400 text-white text-sm font-medium disabled:opacity-50 shadow-glow-brand"
          >
            {loadingShip ? "…" : "Buscar"}
          </button>
        </div>
        {shipment && (
          <div className="text-sm space-y-2 border border-line/10 rounded-lg p-4 bg-ink/[0.02]">
            <p>
              <strong>Status:</strong> {shipment.status} · <strong>Logística:</strong> {shipment.logistic_type || "—"}
            </p>
            <p>
              <strong>Pedido:</strong> {shipment.order_id ?? "—"} · <strong>Loja:</strong> {shipment.seller_nickname}
            </p>
            {shipment.dimensions && (
              <p className="text-fg-muted">
                Dimensões: {shipment.dimensions.height_cm}×{shipment.dimensions.width_cm}×
                {shipment.dimensions.length_cm} cm · {shipment.dimensions.weight_g} g
              </p>
            )}
            {shipment.order_items?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {shipment.order_items.map((i) => (
                  <li key={i.id} className="text-xs text-fg/90">
                    {i.quantity}× {i.title} — R$ {i.unit_price}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

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
