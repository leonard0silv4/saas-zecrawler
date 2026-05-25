import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  BarChart2, RefreshCw, TrendingUp, ShoppingCart, DollarSign,
  Package, AlertTriangle, Tag, ChevronRight, X, ExternalLink,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../services/api";
import { notifyError, notifySuccess } from "../utils/notify.js";

const PERIODS = [
  { label: "7 dias", value: "7d" },
  { label: "15 dias", value: "15d" },
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
];

const INVENTORY_FILTERS = [
  { label: "Todos", value: "" },
  { label: "Full", value: "full" },
  { label: "Normal", value: "normal" },
  { label: "⚠️ Ruptura", value: "ruptura" },
];

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function KpiCard({ icon: Icon, label, value, sub, color = "text-gray-700" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function RupturaAlert({ count }) {
  if (!count) return null;
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
      <AlertTriangle size={16} className="shrink-0" />
      <span>
        <strong>{count}</strong> produto{count > 1 ? "s" : ""} com <strong>Ruptura de Estoque Full</strong>. Reponha o estoque para evitar pausas no anúncio.
      </span>
    </div>
  );
}

function ProductDrawer({ product, onClose }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 truncate pr-4">{product.title}</h3>
          <button onClick={onClose} className="shrink-0 p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4 text-sm">
          {product.thumbnail && (
            <img src={product.thumbnail} alt={product.title} className="w-20 h-20 object-contain rounded-lg border border-gray-100" />
          )}
          <dl className="space-y-2">
            {product.SKU && <Row label="SKU" value={product.SKU} />}
            <Row label="Preço atual" value={formatBRL(product.price)} />
            <Row label="Tipo" value={product.isFull ? "Full" : "Normal/Clássico"} badge={product.isFull ? "full" : "normal"} />
            <Row label="Estoque disponível" value={product.available_quantity ?? "—"} />
            {product.isFull && <Row label="Estoque Full" value={product.estoque_full ?? "—"} />}
            <Row label="Vendidos (total)" value={product.sold_quantity ?? "—"} />
            {product.averageSellDay != null && (
              <Row label="Média vendas/dia" value={product.averageSellDay.toFixed(1)} />
            )}
            {product.daysRestStock != null && (
              <Row label="Dias de estoque restante" value={product.daysRestStock} />
            )}
            {product.alertRuptura && (
              <Row label="Alerta" value={product.alertRuptura} badge={product.alertRuptura.toLowerCase()} />
            )}
            <Row label="Status do anúncio" value={product.status || "—"} />
          </dl>

          {product.historySell?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Histórico de vendas</p>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={product.historySell.slice(-30)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={false} />
                  <YAxis tick={{ fontSize: 10 }} width={28} />
                  <Tooltip formatter={(v) => [v, "Vendas"]} />
                  <Area type="monotone" dataKey="sellQty" stroke="#16a34a" fill="#dcfce7" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {product.permalink && (
            <a
              href={product.permalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-brand-600 hover:underline text-sm"
            >
              Ver anúncio no ML
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, badge }) {
  const badgeColors = {
    full: "bg-green-100 text-green-700",
    normal: "bg-gray-100 text-gray-600",
    ruptura: "bg-red-100 text-red-700",
    crítico: "bg-orange-100 text-orange-700",
    baixo: "bg-yellow-100 text-yellow-700",
  };
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-right">
        {badge ? (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColors[badge] || "bg-gray-100 text-gray-600"}`}>
            {value}
          </span>
        ) : value}
      </dd>
    </div>
  );
}

export default function MeliAnalyticsPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [period, setPeriod] = useState("30d");
  const [activeTab, setActiveTab] = useState("estoque");

  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [inventoryFilter, setInventoryFilter] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    api.get("/meli/accounts").then(({ data }) => {
      setAccounts(data);
      if (data.length) setSelectedAccount(String(data[0].user_id));
    }).catch(() => {});
  }, []);

  const params = useCallback(() => {
    const p = { period };
    if (selectedAccount) p.user_id = selectedAccount;
    return p;
  }, [period, selectedAccount]);

  useEffect(() => {
    if (!selectedAccount) return;
    loadSummary();
    loadChart();
  }, [selectedAccount, period]);

  useEffect(() => {
    if (!selectedAccount) return;
    if (activeTab === "top") loadTop();
    if (activeTab === "pedidos") loadOrders();
    if (activeTab === "estoque") loadInventory();
  }, [activeTab, selectedAccount, period]);

  useEffect(() => {
    if (activeTab === "estoque" && selectedAccount) loadInventory();
  }, [inventoryFilter]);

  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const { data } = await api.get("/meli/analytics/summary", { params: params() });
      setSummary(data);
    } catch { setSummary(null); } finally { setLoadingSummary(false); }
  }

  async function loadChart() {
    setLoadingChart(true);
    try {
      const { data } = await api.get("/meli/analytics/sales-chart", { params: params() });
      setChartData(data);
    } catch { setChartData([]); } finally { setLoadingChart(false); }
  }

  async function loadTop() {
    setLoadingTop(true);
    try {
      const { data } = await api.get("/meli/analytics/top-products", { params: params() });
      setTopProducts(data);
    } catch { setTopProducts([]); } finally { setLoadingTop(false); }
  }

  async function loadOrders() {
    setLoadingOrders(true);
    try {
      const { data } = await api.get("/meli/analytics/orders", { params: params() });
      setOrders(data.orders || []);
    } catch { setOrders([]); } finally { setLoadingOrders(false); }
  }

  async function loadInventory() {
    setLoadingInventory(true);
    try {
      const p = { ...params() };
      if (inventoryFilter) p.filter = inventoryFilter;
      const { data } = await api.get("/meli/analytics/inventory", { params: p });
      setInventory(data);
    } catch { setInventory([]); } finally { setLoadingInventory(false); }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const { data } = await api.post("/meli/analytics/sync", null, {
        params: selectedAccount ? { user_id: selectedAccount } : {},
      });
      notifySuccess(`${data.synced} pedidos sincronizados`);
      loadSummary();
      loadChart();
      if (activeTab === "top") loadTop();
      if (activeTab === "pedidos") loadOrders();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  const rupturaCount = inventory.filter((p) => p.alertRuptura === "RUPTURA").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="text-green-600" />
            Analytics ML
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Vendas, estoque Full e KPIs financeiros — exclusivo Business</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px]"
          >
            {accounts.map((a) => (
              <option key={a.user_id} value={a.user_id}>{a.nickname || `ID ${a.user_id}`}</option>
            ))}
          </select>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-2 transition-colors ${period === p.value ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || !selectedAccount}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando…" : "Sincronizar"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Faturamento"
          value={loadingSummary ? "…" : formatBRL(summary?.faturamento)}
          sub="Pedidos pagos no período"
          color="text-green-700"
        />
        <KpiCard
          icon={TrendingUp}
          label="Liq. Marketplace"
          value={loadingSummary ? "…" : formatBRL(summary?.liq_marketplace)}
          sub={`Taxa ML: ${formatBRL(summary?.taxa_ml)}`}
        />
        <KpiCard
          icon={ShoppingCart}
          label="Pedidos"
          value={loadingSummary ? "…" : (summary?.pedidos ?? "—")}
          sub="Pedidos pagos"
        />
        <KpiCard
          icon={Package}
          label="Ticket Médio"
          value={loadingSummary ? "…" : formatBRL(summary?.ticket_medio)}
        />
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Receita diária</h2>
        {loadingChart ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Carregando…</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="receitaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d) => {
                  try { return format(parseISO(d), "dd/MM", { locale: ptBR }); } catch { return d; }
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip
                formatter={(v) => [formatBRL(v), "Receita"]}
                labelFormatter={(d) => {
                  try { return format(parseISO(d), "dd/MM/yyyy"); } catch { return d; }
                }}
              />
              <Area
                type="monotone"
                dataKey="receita"
                stroke="#16a34a"
                strokeWidth={2}
                fill="url(#receitaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[
            { id: "estoque", label: "Estoque" },
            { id: "top", label: "Top Produtos" },
            { id: "pedidos", label: "Pedidos" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Tab Estoque */}
          {activeTab === "estoque" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <RupturaAlert count={rupturaCount} />
                <div className="flex gap-1 ml-auto">
                  {INVENTORY_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setInventoryFilter(f.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        inventoryFilter === f.value
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingInventory ? (
                <p className="text-sm text-gray-400">Carregando…</p>
              ) : inventory.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum produto encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                        <th className="text-left py-2 pr-4">Produto</th>
                        <th className="text-left py-2 pr-4">SKU</th>
                        <th className="text-right py-2 pr-4">Preço</th>
                        <th className="text-right py-2 pr-4">Estoque</th>
                        <th className="text-center py-2 pr-4">Tipo</th>
                        <th className="text-center py-2 pr-4">Alerta</th>
                        <th className="text-center py-2">Etiqueta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {inventory.map((p) => (
                        <tr
                          key={p._id || p.id}
                          onClick={() => setSelectedProduct(p)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              {p.thumbnail && (
                                <img src={p.thumbnail} alt="" className="w-8 h-8 rounded object-contain shrink-0" />
                              )}
                              <span className="truncate max-w-[200px]">{p.title}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-gray-500 font-mono text-xs">{p.SKU || "—"}</td>
                          <td className="py-2.5 pr-4 text-right font-medium">{formatBRL(p.price)}</td>
                          <td className="py-2.5 pr-4 text-right">
                            {p.isFull ? (
                              <span className={p.estoque_full === 0 ? "text-red-600 font-semibold" : ""}>{p.estoque_full ?? "—"}</span>
                            ) : (
                              p.available_quantity ?? "—"
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.isFull ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                              {p.isFull ? "Full" : "Normal"}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-center">
                            {p.alertRuptura ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                p.alertRuptura === "RUPTURA" ? "bg-red-100 text-red-700" :
                                p.alertRuptura === "CRÍTICO" ? "bg-orange-100 text-orange-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {p.alertRuptura}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Tag size={12} className={p.isFull ? "text-green-600" : "text-gray-400"} />
                              <span className="text-xs text-gray-500">{p.isFull ? "Full" : "Normal"}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab Top Produtos */}
          {activeTab === "top" && (
            <div>
              {loadingTop ? (
                <p className="text-sm text-gray-400">Carregando…</p>
              ) : topProducts.length === 0 ? (
                <p className="text-sm text-gray-400">Sincronize os pedidos para ver o ranking.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                        <th className="text-left py-2 pr-2 w-8">#</th>
                        <th className="text-left py-2 pr-4">Produto</th>
                        <th className="text-left py-2 pr-4">SKU</th>
                        <th className="text-right py-2 pr-4">Unidades</th>
                        <th className="text-right py-2 pr-4">Receita</th>
                        <th className="text-center py-2">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {topProducts.map((p, i) => (
                        <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 pr-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                          <td className="py-2.5 pr-4 truncate max-w-[220px]">{p.title || p._id}</td>
                          <td className="py-2.5 pr-4 text-gray-500 font-mono text-xs">{p.sku || "—"}</td>
                          <td className="py-2.5 pr-4 text-right font-medium">{p.unidades}</td>
                          <td className="py-2.5 pr-4 text-right font-semibold text-green-700">{formatBRL(p.receita)}</td>
                          <td className="py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              p.logistic_type === "fulfillment" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            }`}>
                              {p.logistic_type === "fulfillment" ? "Full" : "Normal"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab Pedidos */}
          {activeTab === "pedidos" && (
            <div>
              {loadingOrders ? (
                <p className="text-sm text-gray-400">Carregando…</p>
              ) : orders.length === 0 ? (
                <p className="text-sm text-gray-400">Sincronize os pedidos para listá-los aqui.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                        <th className="text-left py-2 pr-4">Data</th>
                        <th className="text-left py-2 pr-4">Nº Pedido</th>
                        <th className="text-left py-2 pr-4">Produto(s)</th>
                        <th className="text-right py-2 pr-4">Valor</th>
                        <th className="text-right py-2 pr-4">Taxa ML</th>
                        <th className="text-right py-2 pr-4">Liq.</th>
                        <th className="text-center py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map((o) => (
                        <tr key={o.order_id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                            {o.date_closed
                              ? format(new Date(o.date_closed), "dd/MM/yy HH:mm")
                              : "—"}
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-xs text-gray-600">{o.order_id}</td>
                          <td className="py-2.5 pr-4 max-w-[200px]">
                            <span className="truncate block">{o.order_items?.[0]?.title || "—"}</span>
                            {o.order_items?.length > 1 && (
                              <span className="text-xs text-gray-400">+{o.order_items.length - 1} item(s)</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-medium">{formatBRL(o.total_amount)}</td>
                          <td className="py-2.5 pr-4 text-right text-red-600">{formatBRL(o.ml_fee)}</td>
                          <td className="py-2.5 pr-4 text-right text-green-700 font-medium">
                            {formatBRL(o.total_amount - o.ml_fee)}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              o.status === "paid" ? "bg-green-100 text-green-700" :
                              o.status === "cancelled" ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <ProductDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
