import { useEffect, useState } from "react";
import { ExternalLink, Package, ShoppingBag, Truck } from "lucide-react";
import api from "../services/api";

export default function MeliPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingProd, setLoadingProd] = useState(false);
  const [shipmentId, setShipmentId] = useState("");
  const [shipment, setShipment] = useState(null);
  const [loadingShip, setLoadingShip] = useState(false);

  async function loadAccounts() {
    setLoading(true);
    try {
      const { data } = await api.get("/meli/accounts");
      setAccounts(data);
      if (data.length && !userId) setUserId(String(data[0].user_id));
    } catch {
      alert("Erro ao carregar contas");
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

  async function loadProducts() {
    if (!userId) return;
    setLoadingProd(true);
    try {
      const { data } = await api.get("/meli/products", { params: { user_id: userId } });
      setProducts(data);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao listar produtos");
      setProducts([]);
    } finally {
      setLoadingProd(false);
    }
  }

  async function loadShipment() {
    const id = shipmentId.trim();
    if (!id || !/^\d+$/.test(id)) {
      alert("Informe um ID numérico de envio");
      return;
    }
    setLoadingShip(true);
    setShipment(null);
    try {
      const { data } = await api.get(`/meli/shipment/${id}`);
      setShipment(data);
    } catch (err) {
      alert(err.response?.data?.error || "Envio não encontrado");
    } finally {
      setLoadingShip(false);
    }
  }

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingBag className="text-yellow-500" />
          Mercado Livre
        </h1>
        <p className="text-gray-500 mt-1">Conecte contas OAuth e consulte produtos indexados e envios.</p>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Contas conectadas</h2>
          <button
            type="button"
            onClick={connectAccount}
            className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-medium"
          >
            Conectar nova conta
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Carregando…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma conta. Use o botão acima e autorize no Mercado Livre.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {accounts.map((a) => (
              <li key={a.user_id} className="px-4 py-3 flex justify-between items-center text-sm">
                <span className="font-medium">{a.nickname || `User ${a.user_id}`}</span>
                <span className="text-gray-500 font-mono text-xs">ID {a.user_id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Package size={18} />
          Produtos (cache local)
        </h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Conta (user_id)</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[200px]"
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
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {loadingProd ? "Carregando…" : "Listar"}
          </button>
        </div>
        {products.length > 0 && (
          <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg text-sm">
            {products.slice(0, 50).map((p) => (
              <div key={p._id || p.id} className="px-3 py-2 border-b border-gray-50 flex justify-between gap-2">
                <span className="truncate flex-1">{p.title || p.SKU}</span>
                {p.permalink && (
                  <a href={p.permalink} target="_blank" rel="noreferrer" className="text-brand-600 shrink-0">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))}
            {products.length > 50 && <p className="text-xs text-gray-500 p-2">Mostrando 50 de {products.length}</p>}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Truck size={18} />
          Consultar envio
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]"
            placeholder="ID do shipment (apenas números)"
            value={shipmentId}
            onChange={(e) => setShipmentId(e.target.value)}
          />
          <button
            type="button"
            onClick={loadShipment}
            disabled={loadingShip}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50"
          >
            {loadingShip ? "…" : "Buscar"}
          </button>
        </div>
        {shipment && (
          <div className="text-sm space-y-2 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
            <p>
              <strong>Status:</strong> {shipment.status} · <strong>Logística:</strong> {shipment.logistic_type || "—"}
            </p>
            <p>
              <strong>Pedido:</strong> {shipment.order_id ?? "—"} · <strong>Loja:</strong> {shipment.seller_nickname}
            </p>
            {shipment.dimensions && (
              <p className="text-gray-600">
                Dimensões: {shipment.dimensions.height_cm}×{shipment.dimensions.width_cm}×
                {shipment.dimensions.length_cm} cm · {shipment.dimensions.weight_g} g
              </p>
            )}
            {shipment.order_items?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {shipment.order_items.map((i) => (
                  <li key={i.id} className="text-xs text-gray-700">
                    {i.quantity}× {i.title} — R$ {i.unit_price}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
