import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { BarChart2, RefreshCw, TrendingUp, ShoppingCart, DollarSign, Package, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../services/api";
import { notifyError, notifySuccess } from "../utils/notify.js";
import { KpiCard }       from "../components/meli-analytics/KpiCard";
import { AccountSelect } from "../components/meli-analytics/AccountSelect";
import { ChartTooltip }  from "../components/meli-analytics/ChartTooltip";
import { ProductDrawer } from "../components/meli-analytics/ProductDrawer";
import { InventoryTab }  from "../components/meli-analytics/InventoryTab";
import { TopProductsTab } from "../components/meli-analytics/TopProductsTab";
import { OrdersTab }     from "../components/meli-analytics/OrdersTab";
import { formatBRL }    from "../components/meli-analytics/formatBRL";
import { AIInsightsSection } from "../components/meli-analytics/AIInsightsSection";

const PERIODS = [
  { label: "7d",  value: "7d" },
  { label: "15d", value: "15d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

export default function MeliAnalyticsPage() {
  const [accounts,        setAccounts]        = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [unifiedView, setUnifiedView] = useState(true);
  const [period,          setPeriod]          = useState("30d");
  const [activeTab,       setActiveTab]       = useState("estoque");

  const tabLoadedRef   = useRef(new Set());
  const prevContextRef = useRef({ account: null, period: null, unifiedView: null });
  const tabSectionRef  = useRef(null);

  const [summary,         setSummary]         = useState(null);
  const [chartData,       setChartData]       = useState([]);
  const [topProducts,     setTopProducts]     = useState([]);
  const [orders,          setOrders]          = useState([]);
  const [inventory,       setInventory]       = useState([]);
  const [inventoryType,   setInventoryType]   = useState("");
  const [inventoryAlert,  setInventoryAlert]  = useState("");
  const [inventorySort,   setInventorySort]   = useState({ field: "sold", dir: "desc" });
  const [topSort,         setTopSort]         = useState("receita");
  const [topOnlyActive,   setTopOnlyActive]   = useState(false);

  const [syncing,          setSyncing]          = useState(false);
  const [loadingSummary,   setLoadingSummary]   = useState(false);
  const [loadingChart,     setLoadingChart]     = useState(false);
  const [loadingTop,       setLoadingTop]       = useState(false);
  const [loadingOrders,    setLoadingOrders]    = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [selectedProduct,  setSelectedProduct]  = useState(null);

  const [aiAnalysis,        setAiAnalysis]        = useState(null);
  const [aiGeneratedAt,     setAiGeneratedAt]     = useState(null);
  const [aiAlreadyUsedToday, setAiAlreadyUsedToday] = useState(false);
  const [loadingAI,         setLoadingAI]         = useState(false);

  useEffect(() => {
    api.get("/meli/accounts").then(({ data }) => {
      setAccounts(data);
      if (data.length) setSelectedAccount(String(data[0].user_id));
    }).catch(() => {});
  }, []);

  const params = useCallback(() => {
    const p = { period };
    if (!unifiedView && selectedAccount) p.user_id = selectedAccount;
    return p;
  }, [period, selectedAccount, unifiedView]);

  useEffect(() => {
    if (!unifiedView && !selectedAccount) return;
    loadSummary();
    loadChart();
    loadAiCache();
  }, [selectedAccount, period, unifiedView]);

  // Re-verifica cache ao voltar para a aba (cobre o cenário de aba aberta overnight)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") loadAiCache(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [selectedAccount, period, unifiedView]);

  useEffect(() => {
    if (!unifiedView && !selectedAccount) return;
    if (
      prevContextRef.current.account !== selectedAccount ||
      prevContextRef.current.period !== period ||
      prevContextRef.current.unifiedView !== unifiedView
    ) {
      tabLoadedRef.current = new Set();
      prevContextRef.current = { account: selectedAccount, period, unifiedView };
    }
    if (tabLoadedRef.current.has(activeTab)) return;
    if (activeTab === "top")     loadTop();
    if (activeTab === "pedidos") loadOrders();
    if (activeTab === "estoque") loadInventory();
    tabLoadedRef.current.add(activeTab);
  }, [activeTab, selectedAccount, period, unifiedView]);

  useEffect(() => {
    if (activeTab === "estoque" && (unifiedView || selectedAccount)) loadInventory();
  }, [inventoryType, inventoryAlert, inventorySort, activeTab, selectedAccount, unifiedView]);

  useEffect(() => {
    if (activeTab === "top" && (unifiedView || selectedAccount)) loadTop();
  }, [topSort, topOnlyActive, activeTab, selectedAccount, unifiedView]);

  async function loadAiCache() {
    try {
      const { data } = await api.get("/meli/analytics/ai-analysis", { params: params() });
      if (data.cached) {
        setAiAnalysis(data.analysis);
        setAiGeneratedAt(data.generatedAt);
        setAiAlreadyUsedToday(true);
      } else {
        setAiAlreadyUsedToday(false);
      }
    } catch { /* sem cache, ignora */ }
  }

  async function generateAiAnalysis() {
    setLoadingAI(true);
    try {
      const { data } = await api.post("/meli/analytics/ai-analysis", null, { params: params() });
      setAiAnalysis(data.analysis);
      setAiGeneratedAt(data.generatedAt);
      setAiAlreadyUsedToday(true);
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao gerar análise com IA");
    } finally {
      setLoadingAI(false);
    }
  }

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
    try {
      const { data } = await api.get("/meli/analytics/orders", { params: { ...params(), limit: 1000 } });
      setOrders(data.orders || []);
    } catch { setOrders([]); } finally { setLoadingOrders(false); }
  }
  async function loadInventory() {
    setLoadingInventory(true);
    try {
      const p = { ...params() };
      if (inventoryType)  p.filter = inventoryType;
      if (inventoryAlert) p.alert  = inventoryAlert;
      if (inventorySort.field) { p.sortBy = inventorySort.field; p.sortDir = inventorySort.dir; }
      const { data } = await api.get("/meli/analytics/inventory", { params: p });
      setInventory(data);
    } catch { setInventory([]); } finally { setLoadingInventory(false); }
  }
  async function handleSync(force = false) {
    setSyncing(true);
    try {
      const qp = { ...(!unifiedView && selectedAccount ? { user_id: selectedAccount } : {}), ...(force ? { force: "true" } : {}) };
      const { data } = await api.post("/meli/analytics/sync", null, { params: qp });
      const accountsText = unifiedView && data.accounts ? " em " + data.accounts + " lojas" : "";
      const slowHint = unifiedView ? " Esse processo pode demorar um pouco." : "";
      const baseMessage = force
        ? "Re-sync completo: " + data.synced + " pedidos atualizados" + accountsText + "."
        : data.synced + " pedidos sincronizados" + accountsText + ".";
      notifySuccess(baseMessage + slowHint);
      loadSummary(); loadChart();
      if (activeTab === "top")     loadTop();
      if (activeTab === "pedidos") loadOrders();
      if (activeTab === "estoque") loadInventory();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao sincronizar");
    } finally { setSyncing(false); }
  }

  const rupturaCount = useMemo(() => inventory.filter((p) => p.alertRuptura === "RUPTURA").length, [inventory]);
  const avgReceita   = useMemo(() => chartData.length > 0 ? chartData.reduce((s, d) => s + d.receita, 0) / chartData.length : 0, [chartData]);
  const daysWithSales = useMemo(() => chartData.filter((d) => d.receita > 0).length, [chartData]);

  return (
    <div className="space-y-6 mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 size={22} className="text-green-600" />
            Analytics ML
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Vendas, estoque Full e KPIs financeiros — exclusivo Business</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setUnifiedView(false)}
              className={"px-3 py-1.5 rounded-lg transition-all font-medium " + (!unifiedView ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              Loja
            </button>
            <button
              type="button"
              onClick={() => setUnifiedView(true)}
              className={"px-3 py-1.5 rounded-lg transition-all font-medium " + (unifiedView ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              Todas
            </button>
          </div>
          <AccountSelect accounts={accounts} value={selectedAccount} onChange={setSelectedAccount} disabled={unifiedView} />
          <div className="flex bg-gray-100 rounded-xl p-0.5 text-sm">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                  period === p.value ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleSync(false)}
            disabled={syncing || (unifiedView ? accounts.length === 0 : !selectedAccount)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando…" : (unifiedView ? "Sincronizar todas" : "Sincronizar")}
          </button>
          <button
            onClick={() => handleSync(true)}
            disabled={syncing || (unifiedView ? accounts.length === 0 : !selectedAccount)}
            title="Re-processa 90 dias"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} /> Re-sync 90d
          </button>
          <button
            onClick={generateAiAnalysis}
            disabled={loadingAI || loadingSummary || aiAlreadyUsedToday || (unifiedView ? accounts.length === 0 : !selectedAccount)}
            title={aiAlreadyUsedToday ? "Análise gerada hoje · disponível amanhã" : "Gerar análise com IA"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Sparkles size={13} className={loadingAI ? "animate-pulse" : ""} />
            {loadingAI ? "Gerando…" : aiAlreadyUsedToday ? "IA usada hoje" : "Análise IA"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="Faturamento"       value={loadingSummary ? "…" : formatBRL(summary?.faturamento)}      sub="Pedidos pagos no período"            color="text-green-700"  accent="bg-green-50" />
        <KpiCard icon={TrendingUp} label="Liq. Marketplace"  value={loadingSummary ? "…" : formatBRL(summary?.liq_marketplace)}  sub={`Taxa ML: ${formatBRL(summary?.taxa_ml)}`} color="text-blue-700"   accent="bg-blue-50" />
        <KpiCard icon={ShoppingCart} label="Pedidos"         value={loadingSummary ? "…" : (summary?.pedidos ?? "—")}            sub="Pedidos pagos"                       color="text-violet-700" accent="bg-violet-50" />
        <KpiCard icon={Package}    label="Ticket Médio"      value={loadingSummary ? "…" : formatBRL(summary?.ticket_medio)}                                               color="text-orange-700" accent="bg-orange-50" />
      </div>

      {/* Painel de Análise IA */}
      {aiAnalysis && (
        <AIInsightsSection
          aiAnalysis={aiAnalysis}
          aiGeneratedAt={aiGeneratedAt}
          onDismiss={() => setAiAnalysis(null)}
        />
      )}

      {/* Gráfico Receita & Pedidos */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Receita & Pedidos diários</h2>
            <p className="text-xs text-gray-400 mt-0.5">{unifiedView ? "Todas as lojas — receita bruta e volume de pedidos" : "Período selecionado — receita bruta e volume de pedidos"}</p>
          </div>
          {!loadingChart && chartData.length > 0 && (
            <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
              {daysWithSales} dias com vendas
            </span>
          )}
        </div>
        {loadingChart ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            <RefreshCw size={18} className="animate-spin mr-2" /> Carregando…
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Nenhum dado para o período.</div>
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
                tickFormatter={(d) => { try { return format(parseISO(d), "dd/MM", { locale: ptBR }); } catch { return d; } }}
                interval="preserveStartEnd"
              />
              <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v}`} width={52} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#d1fae5", strokeWidth: 2 }} />
              {avgReceita > 0 && (
                <ReferenceLine yAxisId="left" y={avgReceita} stroke="#16a34a" strokeDasharray="6 3" strokeOpacity={0.45}
                  label={{ value: "Média", position: "insideTopRight", fontSize: 10, fill: "#16a34a", opacity: 0.6 }}
                />
              )}
              <Bar      yAxisId="right" dataKey="pedidos" name="pedidos" fill="#86efac" radius={[4,4,0,0]} maxBarSize={16} />
              <Area     yAxisId="left"  type="monotone" dataKey="receita" name="receita" stroke="#16a34a" strokeWidth={2.5} fill="url(#recGrad)" dot={false} activeDot={{ r: 5, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }} />
              <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={8}
                formatter={(value) => <span className="text-xs text-gray-500 font-medium">{value === "receita" ? "Receita (R$)" : "Pedidos"}</span>}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabs */}
      <div ref={tabSectionRef} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-100 px-2 pt-2 gap-1">
          {[
            { id: "estoque", label: "Estoque" },
            { id: "top",     label: "Top Produtos" },
            { id: "pedidos", label: "Pedidos" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                requestAnimationFrame(() => tabSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
              }}
              className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                activeTab === tab.id ? "bg-green-50 text-green-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          <div style={{ display: activeTab === "estoque" ? "block" : "none" }}>
            <InventoryTab
              inventory={inventory}
              loading={loadingInventory}
              inventoryType={inventoryType}
              setInventoryType={setInventoryType}
              inventoryAlert={inventoryAlert}
              setInventoryAlert={setInventoryAlert}
              inventorySort={inventorySort}
              setInventorySort={setInventorySort}
              rupturaCount={rupturaCount}
              onProductSelect={setSelectedProduct}
            />
          </div>
          <div style={{ display: activeTab === "top" ? "block" : "none" }}>
            <TopProductsTab
              topProducts={topProducts}
              loading={loadingTop}
              topSort={topSort}
              setTopSort={setTopSort}
              topOnlyActive={topOnlyActive}
              setTopOnlyActive={setTopOnlyActive}
            />
          </div>
          <div style={{ display: activeTab === "pedidos" ? "block" : "none" }}>
            <OrdersTab orders={orders} loading={loadingOrders} />
          </div>
        </div>
      </div>

      <ProductDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
