import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ComposedChart, AreaChart, Area, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import {
  BarChart2, RefreshCw, TrendingUp, ShoppingCart, DollarSign,
  Package, AlertTriangle, X, ExternalLink, Store, ChevronDown, Check,
  ArrowUp, ArrowDown,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../services/api";
import { notifyError, notifySuccess } from "../utils/notify.js";

const PERIODS = [
  { label: "7d",  value: "7d" },
  { label: "15d", value: "15d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

const INVENTORY_FILTERS = [
  { label: "Todos",      value: "" },
  { label: "Full",       value: "full" },
  { label: "Normal",     value: "normal" },
  { label: "⚠️ Ruptura", value: "ruptura" },
];

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

/* ── KPI Card ─────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, color = "text-gray-800", accent = "bg-gray-50" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${accent}`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/* ── Alerta de ruptura ────────────────────────────────────────── */
function RupturaAlert({ count }) {
  if (!count) return null;
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      <AlertTriangle size={16} className="shrink-0" />
      <span>
        <strong>{count}</strong> produto{count > 1 ? "s" : ""} com{" "}
        <strong>Ruptura de Estoque Full</strong>. Reponha para evitar pausas.
      </span>
    </div>
  );
}

/* ── Drawer de produto de estoque ─────────────────────────────── */
function ProductDrawer({ product, onClose }) {
  const [open, setOpen]       = useState(false);
  const [closing, setClosing] = useState(false);
  const rafRef = useRef(null);

  /* Abre com animação: renderiza fechado → próximo frame → abre */
  useEffect(() => {
    if (product) {
      setClosing(false);
      rafRef.current = requestAnimationFrame(() => setOpen(true));
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [product]);

  /* Dispara animação de saída e chama onClose quando termina */
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => { setOpen(false); onClose(); }, 280);
    return () => clearTimeout(t);
  }, [closing, onClose]);

  function handleClose() { setClosing(true); }

  if (!product) return null;

  const isOpen = open && !closing;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
    >
      <div className="flex-1 bg-black/30" onClick={handleClose} />
      <div className={`w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden
        transition-transform duration-300 ease-out
        ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 truncate pr-4">{product.title}</h3>
          <button onClick={handleClose} className="shrink-0 p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4 text-sm">
          {product.thumbnail && (
            <img
              src={product.thumbnail}
              alt={product.title}
              className="w-20 h-20 object-contain rounded-xl border border-gray-100"
            />
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Histórico de vendas
              </p>
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
              Ver anúncio no ML <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Row({ label, value, badge }) {
  const badgeColors = {
    full:    "bg-green-100 text-green-700",
    normal:  "bg-gray-100 text-gray-600",
    ruptura: "bg-red-100 text-red-700",
    crítico: "bg-orange-100 text-orange-700",
    baixo:   "bg-yellow-100 text-yellow-700",
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

/* ── Tooltip customizado do gráfico ──────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const receita = payload.find((p) => p.dataKey === "receita")?.value ?? 0;
  const pedidos  = payload.find((p) => p.dataKey === "pedidos")?.value  ?? 0;
  let dateLabel = label;
  try { dateLabel = format(parseISO(label), "EEE, dd/MM/yyyy", { locale: ptBR }); } catch { /* noop */ }
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[170px]">
      <p className="text-xs text-gray-500 mb-2 capitalize">{dateLabel}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          Receita
        </span>
        <span className="font-semibold text-green-700">{formatBRL(receita)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 mt-1">
        <span className="flex items-center gap-1.5 text-gray-600">
          <span className="w-2.5 h-2.5 rounded bg-green-200 inline-block" />
          Pedidos
        </span>
        <span className="font-semibold text-gray-700">{pedidos}</span>
      </div>
    </div>
  );
}

/* ── Seletor de conta ML ──────────────────────────────────────── */
function AccountSelect({ accounts, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  /* Fecha ao clicar fora */
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = accounts.find((a) => String(a.user_id) === String(value));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 min-w-[175px] transition-colors shadow-sm"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-yellow-400/20 shrink-0">
          <Store size={13} className="text-yellow-600" />
        </span>
        <span className="flex-1 text-left truncate">
          {selected?.nickname || (accounts.length === 0 ? "Nenhuma conta" : "Selecionar loja")}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && accounts.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[220px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
          {accounts.map((a) => {
            const isSelected = String(a.user_id) === String(value);
            return (
              <button
                key={a.user_id}
                type="button"
                onClick={() => { onChange(String(a.user_id)); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                  isSelected ? "bg-green-50 text-green-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-yellow-400/15 shrink-0">
                  <Store size={13} className="text-yellow-600" />
                </span>
                <span className="flex-1 truncate">{a.nickname || `ID ${a.user_id}`}</span>
                {isSelected && <Check size={14} className="shrink-0 text-green-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Página principal
═══════════════════════════════════════════════════════════════ */
export default function MeliAnalyticsPage() {
  const [accounts,        setAccounts]        = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [period,          setPeriod]          = useState("30d");
  const [activeTab,       setActiveTab]       = useState("estoque");

  const [summary,         setSummary]         = useState(null);
  const [chartData,       setChartData]       = useState([]);
  const [topProducts,     setTopProducts]     = useState([]);
  const [orders,          setOrders]          = useState([]);
  const [inventory,       setInventory]       = useState([]);
  const [inventoryFilter, setInventoryFilter] = useState("");
  const [inventorySort,   setInventorySort]   = useState({ field: "sold", dir: "desc" });
  const [topSort,         setTopSort]         = useState("receita");
  const [topOnlyActive,   setTopOnlyActive]   = useState(false);

  const [syncing,          setSyncing]          = useState(false);
  const [loadingSummary,   setLoadingSummary]   = useState(false);
  const [loadingChart,     setLoadingChart]     = useState(false);
  const [loadingTop,       setLoadingTop]       = useState(false);
  const [loadingOrders,    setLoadingOrders]    = useState(false);
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
    if (activeTab === "top")     loadTop();
    if (activeTab === "pedidos") loadOrders();
    if (activeTab === "estoque") loadInventory();
  }, [activeTab, selectedAccount, period]);

  useEffect(() => {
    if (activeTab === "estoque" && selectedAccount) loadInventory();
  }, [inventoryFilter, inventorySort]);

  useEffect(() => {
    if (activeTab === "top" && selectedAccount) loadTop();
  }, [topSort, topOnlyActive]);

  async function loadSummary() {
    setLoadingSummary(true);
    try { const { data } = await api.get("/meli/analytics/summary", { params: params() }); setSummary(data); }
    catch { setSummary(null); } finally { setLoadingSummary(false); }
  }
  async function loadChart() {
    setLoadingChart(true);
    try { const { data } = await api.get("/meli/analytics/sales-chart", { params: params() }); setChartData(data); }
    catch { setChartData([]); } finally { setLoadingChart(false); }
  }
  async function loadTop() {
    setLoadingTop(true);
    try {
      const p = { ...params(), sortBy: topSort };
      if (topOnlyActive) p.onlyActive = "true";
      const { data } = await api.get("/meli/analytics/top-products", { params: p });
      setTopProducts(data);
    } catch { setTopProducts([]); } finally { setLoadingTop(false); }
  }
  async function loadOrders() {
    setLoadingOrders(true);
    try { const { data } = await api.get("/meli/analytics/orders", { params: params() }); setOrders(data.orders || []); }
    catch { setOrders([]); } finally { setLoadingOrders(false); }
  }
  async function loadInventory() {
    setLoadingInventory(true);
    try {
      const p = { ...params() };
      if (inventoryFilter) p.filter = inventoryFilter;
      if (inventorySort.field) {
        p.sortBy  = inventorySort.field;
        p.sortDir = inventorySort.dir;
      }
      const { data } = await api.get("/meli/analytics/inventory", { params: p });
      setInventory(data);
    } catch { setInventory([]); } finally { setLoadingInventory(false); }
  }

  async function handleSync(force = false) {
    setSyncing(true);
    try {
      const qp = { ...(selectedAccount ? { user_id: selectedAccount } : {}), ...(force ? { force: "true" } : {}) };
      const { data } = await api.post("/meli/analytics/sync", null, { params: qp });
      notifySuccess(
        force
          ? `Re-sync completo: ${data.synced} pedidos atualizados`
          : `${data.synced} pedidos sincronizados`
      );
      loadSummary(); loadChart();
      if (activeTab === "top")     loadTop();
      if (activeTab === "pedidos") loadOrders();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao sincronizar");
    } finally { setSyncing(false); }
  }

  const rupturaCount = inventory.filter((p) => p.alertRuptura === "RUPTURA").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="text-green-600" />
            Analytics ML
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Vendas, estoque Full e KPIs financeiros — exclusivo Business</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AccountSelect
            accounts={accounts}
            value={selectedAccount}
            onChange={setSelectedAccount}
          />

          {/* Período */}
          <div className="flex bg-gray-100 rounded-xl p-0.5 text-sm">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                  period === p.value
                    ? "bg-white text-green-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSync(false)}
            disabled={syncing || !selectedAccount}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando…" : "Sincronizar"}
          </button>
          <button
            onClick={() => handleSync(true)}
            disabled={syncing || !selectedAccount}
            title="Re-processa 90 dias — corrige taxas ML e dados desatualizados"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} />
            Re-sync 90d
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Faturamento"
          value={loadingSummary ? "…" : formatBRL(summary?.faturamento)}
          sub="Pedidos pagos no período"
          color="text-green-700"
          accent="bg-green-50"
        />
        <KpiCard
          icon={TrendingUp}
          label="Liq. Marketplace"
          value={loadingSummary ? "…" : formatBRL(summary?.liq_marketplace)}
          sub={`Taxa ML: ${formatBRL(summary?.taxa_ml)}`}
          color="text-blue-700"
          accent="bg-blue-50"
        />
        <KpiCard
          icon={ShoppingCart}
          label="Pedidos"
          value={loadingSummary ? "…" : (summary?.pedidos ?? "—")}
          sub="Pedidos pagos"
          color="text-violet-700"
          accent="bg-violet-50"
        />
        <KpiCard
          icon={Package}
          label="Ticket Médio"
          value={loadingSummary ? "…" : formatBRL(summary?.ticket_medio)}
          color="text-orange-700"
          accent="bg-orange-50"
        />
      </div>

      {/* ── Gráfico ───────────────────────────────────────────── */}
      {(() => {
        const avgReceita = chartData.length > 0
          ? chartData.reduce((sum, d) => sum + d.receita, 0) / chartData.length
          : 0;
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Receita & Pedidos diários</h2>
                <p className="text-xs text-gray-400 mt-0.5">Período selecionado — receita bruta e volume de pedidos</p>
              </div>
              {!loadingChart && chartData.length > 0 && (
                <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                  {chartData.filter((d) => d.receita > 0).length} dias com vendas
                </span>
              )}
            </div>

            {loadingChart ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                <RefreshCw size={18} className="animate-spin mr-2" /> Carregando…
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                Nenhum dado para o período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#16a34a" stopOpacity={0.35} />
                      <stop offset="75%"  stopColor="#16a34a" stopOpacity={0.06} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />

                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d) => {
                      try { return format(parseISO(d), "dd/MM", { locale: ptBR }); } catch { return d; }
                    }}
                    interval="preserveStartEnd"
                  />

                  {/* Eixo Y esquerdo — receita */}
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                    }
                    width={52}
                  />

                  {/* Eixo Y direito — pedidos */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={28}
                  />

                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#d1fae5", strokeWidth: 2 }} />

                  {/* Linha de média de receita */}
                  {avgReceita > 0 && (
                    <ReferenceLine
                      yAxisId="left"
                      y={avgReceita}
                      stroke="#16a34a"
                      strokeDasharray="6 3"
                      strokeOpacity={0.45}
                      label={{ value: "Média", position: "insideTopRight", fontSize: 10, fill: "#16a34a", opacity: 0.6 }}
                    />
                  )}

                  {/* Barras de pedidos (atrás) */}
                  <Bar
                    yAxisId="right"
                    dataKey="pedidos"
                    name="pedidos"
                    fill="#86efac"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={16}
                  />

                  {/* Área de receita (frente) */}
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="receita"
                    name="receita"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    fill="url(#recGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-gray-500 font-medium">
                        {value === "receita" ? "Receita (R$)" : "Pedidos"}
                      </span>
                    )}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        );
      })()}

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-100 px-2 pt-2 gap-1">
          {[
            { id: "estoque", label: "Estoque" },
            { id: "top",     label: "Top Produtos" },
            { id: "pedidos", label: "Pedidos" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                activeTab === tab.id
                  ? "bg-green-50 text-green-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── Tab Estoque ─────────────────────────────────── */}
          <div className="space-y-4" style={{ display: activeTab === "estoque" ? "block" : "none" }}>
              <div className="flex flex-wrap items-center gap-2">
                <RupturaAlert count={rupturaCount} />
                <div className="flex flex-wrap gap-2 ml-auto items-center">
                  {/* Ordenação */}
                  <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
                    {[
                      { value: "sold",     label: "Mais vendidos" },
                      { value: "velocity", label: "Velocidade" },
                      { value: "stock",    label: "Estoque" },
                      { value: "price",    label: "Preço" },
                    ].map((s) => {
                      const isActive = inventorySort.field === s.value;
                      const dir = isActive ? inventorySort.dir : null;
                      function handleClick() {
                        setInventorySort((prev) => {
                          if (prev.field !== s.value) {
                            // Estoque: 1º clique → desc (maior → menor); demais → asc
                            const defaultDir = s.value === "stock" ? "desc" : "asc";
                            return { field: s.value, dir: defaultDir };
                          }
                          // Toggle para estoque: desc → asc → null
                          if (s.value === "stock") {
                            if (prev.dir === "desc") return { field: s.value, dir: "asc" };
                            return { field: null, dir: null };
                          }
                          // Toggle para outros campos: asc → desc → null
                          if (prev.dir === "asc") return { field: s.value, dir: "desc" };
                          return { field: null, dir: null };
                        });
                      }
                      return (
                        <button
                          key={s.value}
                          onClick={handleClick}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-semibold ${
                            isActive
                              ? "bg-white text-green-700 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {s.label}
                          {dir === "asc"  && <ArrowUp  size={10} className="shrink-0" />}
                          {dir === "desc" && <ArrowDown size={10} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  {/* Filtro */}
                  <div className="flex gap-1">
                    {INVENTORY_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setInventoryFilter(f.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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
              </div>

              {inventory.length === 0 && loadingInventory ? (
                <p className="text-sm text-gray-400">Carregando…</p>
              ) : inventory.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum produto encontrado. Clique em Sincronizar para importar seus anúncios.</p>
              ) : (
                <div className={`overflow-x-auto transition-opacity duration-200 ${loadingInventory ? "opacity-50 pointer-events-none" : ""}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                        <th className="text-left py-2 pr-4 font-semibold">Produto</th>
                        <th className="text-left py-2 pr-4 font-semibold">SKU</th>
                        <th className="text-right py-2 pr-4 font-semibold">Preço</th>
                        <th className="text-right py-2 pr-4 font-semibold">Total Vendido</th>
                        <th className="text-right py-2 pr-4 font-semibold">un/dia</th>
                        <th className="text-right py-2 pr-4 font-semibold">Estoque</th>
                        <th className="text-center py-2 pr-4 font-semibold">Tipo</th>
                        <th className="text-center py-2 font-semibold">Alerta</th>
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
                            <div className="flex items-center gap-2.5">
                              {p.thumbnail ? (
                                <img src={p.thumbnail} alt="" className="w-8 h-8 rounded-lg object-contain shrink-0 border border-gray-100" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                                  <Package size={12} className="text-gray-400" />
                                </div>
                              )}
                              <span className="truncate max-w-[200px] font-medium">{p.title}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-gray-400 font-mono text-xs">{p.SKU || "—"}</td>
                          <td className="py-2.5 pr-4 text-right font-semibold">{formatBRL(p.price)}</td>
                          <td className="py-2.5 pr-4 text-right font-semibold text-gray-700">
                            {p.sold_quantity ?? "—"}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-xs text-gray-500">
                            {p.averageSellDay > 0 ? p.averageSellDay.toFixed(1) : "—"}
                          </td>
                          <td className="py-2.5 pr-4 text-right">
                            {p.isFull ? (
                              <span className={p.estoque_full === 0 ? "text-red-600 font-bold" : "font-medium"}>
                                {p.estoque_full ?? "—"}
                              </span>
                            ) : (
                              <span className="font-medium">{p.available_quantity ?? "—"}</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              p.isFull ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            }`}>
                              {p.isFull ? "Full" : "Normal"}
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            {p.alertRuptura ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                p.alertRuptura === "RUPTURA"  ? "bg-red-100 text-red-700" :
                                p.alertRuptura === "CRÍTICO"  ? "bg-orange-100 text-orange-700" :
                                                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {p.alertRuptura}
                              </span>
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          {/* ── Tab Top Produtos ────────────────────────────── */}
          <div className="space-y-4" style={{ display: activeTab === "top" ? "block" : "none" }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-gray-400">
                  {topSort === "receita"
                    ? "Ordenado por maior faturamento (R$) — um produto com preço maior pode superar outro com mais unidades"
                    : "Ordenado por maior quantidade de unidades vendidas"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filtro: somente ativos */}
                  <button
                    onClick={() => setTopOnlyActive((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      topOnlyActive
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${topOnlyActive ? "bg-white" : "bg-gray-300"}`} />
                    Só disponíveis
                  </button>

                  {/* Ordenação */}
                  <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
                    {[
                      { value: "receita",  label: "💰 Receita" },
                      { value: "unidades", label: "📦 Unidades" },
                    ].map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setTopSort(s.value)}
                        className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                          topSort === s.value
                            ? "bg-white text-green-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {loadingTop ? (
                <p className="text-sm text-gray-400">Carregando…</p>
              ) : topProducts.length === 0 ? (
                <p className="text-sm text-gray-400">Sincronize os pedidos para ver o ranking.</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                    return (
                      <div
                        key={p._id}
                        className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                          i < 3 ? "bg-green-50/60 border border-green-100" : "bg-gray-50/60 hover:bg-gray-100/60"
                        }`}
                      >
                        {/* Rank */}
                        <div className="w-8 shrink-0 text-center">
                          {medal ? (
                            <span className="text-xl leading-none">{medal}</span>
                          ) : (
                            <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                          )}
                        </div>

                        {/* Foto */}
                        {p.thumbnail ? (
                          <img
                            src={p.thumbnail}
                            alt={p.title}
                            className="w-12 h-12 rounded-xl object-contain border border-gray-100 bg-white shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shrink-0 flex items-center justify-center">
                            <Package size={18} className="text-gray-300" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-sm">{p.title || p._id}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {p.sku && (
                              <span className="text-xs text-gray-400 font-mono bg-white border border-gray-100 px-1.5 py-0.5 rounded">
                                {p.sku}
                              </span>
                            )}
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              p.logistic_type === "fulfillment"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {p.logistic_type === "fulfillment" ? "Full" : "Normal"}
                            </span>
                            {/* Indicativo de produto inativo / removido */}
                            {(!p.thumbnail && !p.permalink) ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                                Removido
                              </span>
                            ) : p.productStatus === "closed" ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                Encerrado
                              </span>
                            ) : p.productStatus === "paused" ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                                Pausado
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Métricas */}
                        <div className="text-right shrink-0 space-y-0.5">
                          <p className="text-base font-bold text-green-700">{formatBRL(p.receita)}</p>
                          <p className="text-xs text-gray-400">{p.unidades} un vendidas</p>
                        </div>

                        {/* Link ML */}
                        {p.permalink && (
                          <a
                            href={p.permalink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-green-700 transition-colors"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          {/* ── Tab Pedidos ─────────────────────────────────── */}
          <div style={{ display: activeTab === "pedidos" ? "block" : "none" }}>
              {loadingOrders ? (
                <p className="text-sm text-gray-400">Carregando…</p>
              ) : orders.length === 0 ? (
                <p className="text-sm text-gray-400">Sincronize os pedidos para listá-los aqui.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                        <th className="text-left py-2 pr-4 font-semibold">Data</th>
                        <th className="text-left py-2 pr-4 font-semibold">Nº Pedido</th>
                        <th className="text-left py-2 pr-4 font-semibold">Produto(s)</th>
                        <th className="text-right py-2 pr-4 font-semibold">Valor</th>
                        <th className="text-right py-2 pr-4 font-semibold">Taxa ML</th>
                        <th className="text-right py-2 pr-4 font-semibold">Liq.</th>
                        <th className="text-center py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map((o) => (
                        <tr key={o.order_id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap text-xs">
                            {o.date_closed
                              ? format(new Date(o.date_closed), "dd/MM/yy HH:mm")
                              : "—"}
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-xs text-gray-400">{o.order_id}</td>
                          <td className="py-2.5 pr-4 max-w-[200px]">
                            <span className="truncate block font-medium">{o.order_items?.[0]?.title || "—"}</span>
                            {o.order_items?.length > 1 && (
                              <span className="text-xs text-gray-400">+{o.order_items.length - 1} item(s)</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-semibold">{formatBRL(o.total_amount)}</td>
                          <td className="py-2.5 pr-4 text-right text-red-500 font-medium">{formatBRL(o.ml_fee)}</td>
                          <td className="py-2.5 pr-4 text-right text-green-700 font-semibold">
                            {formatBRL(o.total_amount - o.ml_fee)}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              o.status === "paid"      ? "bg-green-100 text-green-700" :
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
        </div>
      </div>

      <ProductDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
