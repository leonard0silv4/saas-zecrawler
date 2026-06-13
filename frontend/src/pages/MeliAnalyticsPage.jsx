import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ComposedChart, Area, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { BarChart2, RefreshCw, TrendingUp, ShoppingCart, DollarSign, Package, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../services/api";
import { notifyError, notifySuccess } from "../utils/notify.js";
import { KpiCard }           from "../components/meli-analytics/KpiCard";
import { AccountSelect }     from "../components/meli-analytics/AccountSelect";
import { ChartTooltip }      from "../components/meli-analytics/ChartTooltip";
import { DateRangePicker }   from "../components/meli-analytics/DateRangePicker";
import { formatBRL }         from "../components/meli-analytics/formatBRL";
import { AIInsightsSection } from "../components/meli-analytics/AIInsightsSection";
import { OrdersTab }         from "../components/meli-analytics/OrdersTab";

const TABS = [
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "pedidos",   label: "Pedidos",   icon: ShoppingCart },
];

const PERIODS = [
  { label: "7d",  value: "7d" },
  { label: "15d", value: "15d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

const QK = {
  accounts: () => ["meli-analytics-accounts"],
  summary:  (userId, period, cr) => ["analytics-summary", userId, period, cr ? `${cr.from}-${cr.to}` : null],
  chart:    (userId, period, cr) => ["analytics-chart",   userId, period, cr ? `${cr.from}-${cr.to}` : null],
  ai:       (userId, period)     => ["analytics-ai",      userId, period],
  orders:   (userId, period)     => ["analytics-orders",  userId, period],
};

export default function MeliAnalyticsPage() {
  const queryClient = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState("");
  const [unifiedView,     setUnifiedView]     = useState(true);
  const [period,          setPeriod]          = useState("30d");
  const [customRange,     setCustomRange]     = useState(null);
  const [activeTab,       setActiveTab]       = useState("analytics");
  const [syncing,         setSyncing]         = useState(false);
  const [loadingAI,       setLoadingAI]       = useState(false);
  const [aiDismissed,     setAiDismissed]     = useState(false);

  const userId = !unifiedView && selectedAccount ? selectedAccount : null;
  const dateParams = customRange
    ? { from: format(customRange.from, "yyyy-MM-dd"), to: format(customRange.to, "yyyy-MM-dd") }
    : { period };

  const { data: accounts = [] } = useQuery({
    queryKey: QK.accounts(),
    queryFn: () => api.get("/meli/accounts").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (accounts.length && !selectedAccount) setSelectedAccount(String(accounts[0].user_id));
  }, [accounts, selectedAccount]);

  useEffect(() => { setAiDismissed(false); }, [userId, period]);

  const enabled = unifiedView || !!selectedAccount;

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: QK.summary(userId, period, customRange),
    queryFn: () => api.get("/meli/analytics/summary", { params: { ...dateParams, ...(userId ? { user_id: userId } : {}) } }).then(r => r.data),
    enabled,
  });

  const { data: chartData = [], isLoading: loadingChart } = useQuery({
    queryKey: QK.chart(userId, period, customRange),
    queryFn: () => api.get("/meli/analytics/sales-chart", { params: { ...dateParams, ...(userId ? { user_id: userId } : {}) } }).then(r => r.data),
    enabled,
  });

  const { data: aiCache } = useQuery({
    queryKey: QK.ai(userId, period),
    queryFn: () => api.get("/meli/analytics/ai-analysis", { params: { period, ...(userId ? { user_id: userId } : {}) } }).then(r => r.data).catch(() => null),
    enabled,
    staleTime: 60 * 60 * 1000,
  });

  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: QK.orders(userId, period),
    queryFn: () => api.get("/meli/analytics/orders", { params: { period, ...(userId ? { user_id: userId } : {}), limit: 1000 } }).then(r => r.data),
    enabled: enabled && activeTab === "pedidos",
  });
  const orders = ordersData?.orders ?? [];

  const aiAnalysis = !aiDismissed && aiCache?.cached ? aiCache.analysis : null;
  const aiGeneratedAt = aiCache?.cached ? aiCache.generatedAt : null;
  const aiAlreadyUsedToday = !!aiCache?.cached;

  async function generateAiAnalysis() {
    setLoadingAI(true);
    try {
      await api.post("/meli/analytics/ai-analysis", null, { params: { period, ...(userId ? { user_id: userId } : {}) } });
      queryClient.invalidateQueries({ queryKey: QK.ai(userId, period) });
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao gerar análise com IA");
    } finally {
      setLoadingAI(false);
    }
  }

  async function handleSync(force = false) {
    setSyncing(true);
    try {
      const qp = { ...(userId ? { user_id: userId } : {}), ...(force ? { force: "true" } : {}) };
      const { data } = await api.post("/meli/analytics/sync", null, { params: qp });
      const accountsText = unifiedView && data.accounts ? " em " + data.accounts + " lojas" : "";
      const slowHint = unifiedView ? " Esse processo pode demorar um pouco." : "";
      const baseMessage = force
        ? "Re-sync completo: " + data.synced + " pedidos atualizados" + accountsText + "."
        : data.synced + " pedidos sincronizados" + accountsText + ".";
      notifySuccess(baseMessage + slowHint);
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-chart"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-orders"] });
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao sincronizar");
    } finally { setSyncing(false); }
  }

  function handlePeriodChange(p) {
    setPeriod(p);
    setCustomRange(null);
  }

  function handleCustomRange(range) {
    setCustomRange(range);
    setPeriod("");
  }

  const avgReceita    = useMemo(() => chartData.length > 0 ? chartData.reduce((s, d) => s + d.receita, 0) / chartData.length : 0, [chartData]);
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
                onClick={() => handlePeriodChange(p.value)}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                  period === p.value && !customRange ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
            <DateRangePicker value={customRange} onChange={handleCustomRange} />
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
            disabled={loadingAI || loadingSummary || aiAlreadyUsedToday || !!customRange || (unifiedView ? accounts.length === 0 : !selectedAccount)}
            title={
              customRange
                ? "Análise IA indisponível para período personalizado. Selecione 7d, 15d, 30d ou 90d."
                : aiAlreadyUsedToday
                ? "Análise gerada hoje · disponível amanhã"
                : "Gerar análise com IA"
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Sparkles size={13} className={loadingAI ? "animate-pulse" : ""} />
            {loadingAI
              ? "Gerando…"
              : aiAlreadyUsedToday
              ? "IA usada hoje"
              : customRange
              ? "Análise IA · indisponível"
              : `Análise IA · ${period}`}
          </button>
        </div>
      </div>

      {/* Tab nav + pedidos panel num único card; analytics renderiza diretamente na página */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center border-b border-gray-100 px-2 pt-2 pb-1 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                activeTab === tab.id
                  ? "bg-green-50 text-green-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === "pedidos" && orders.length > 0 && (
                <span className="ml-0.5 text-xs font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full leading-none">
                  {orders.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pedidos: dentro do card */}
        <div style={{ display: activeTab === "pedidos" ? "block" : "none" }} className="p-5">
          <OrdersTab orders={orders} loading={loadingOrders} />
        </div>
      </div>

      {/* Analytics: fora do card, cada seção tem seu próprio card — sem duplo aninhamento */}
      <div className="space-y-5" style={{ display: activeTab === "analytics" ? "block" : "none" }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={DollarSign}   label="Faturamento"      value={loadingSummary ? "…" : formatBRL(summary?.faturamento)}      sub="Pedidos pagos no período"            color="text-green-700"  accent="bg-green-50" />
          <KpiCard icon={TrendingUp}   label="Liq. Marketplace" value={loadingSummary ? "…" : formatBRL(summary?.liq_marketplace)}  sub={`Taxa ML: ${formatBRL(summary?.taxa_ml)}`} color="text-blue-700"   accent="bg-blue-50" />
          <KpiCard icon={ShoppingCart} label="Pedidos"          value={loadingSummary ? "…" : (summary?.pedidos ?? "—")}            sub="Pedidos pagos"                       color="text-violet-700" accent="bg-violet-50" />
          <KpiCard icon={Package}      label="Ticket Médio"     value={loadingSummary ? "…" : formatBRL(summary?.ticket_medio)}                                               color="text-orange-700" accent="bg-orange-50" />
        </div>

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

        {aiAnalysis && (
          <AIInsightsSection
            aiAnalysis={aiAnalysis}
            aiGeneratedAt={aiGeneratedAt}
            onDismiss={() => setAiDismissed(true)}
          />
        )}
      </div>
    </div>
  );
}
