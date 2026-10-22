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
import { PageHeader, Tabs, Button, EmptyState } from "../components/ui";
import { ChartGlowDefs } from "../components/charts";
import { chartAxis, chartGrid, chartColors, chartLegendProps, neonActiveDot } from "../lib/chartTheme";

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

  const tabItems = TABS.map((t) => ({
    value: t.id,
    icon: t.icon,
    label: t.id === "pedidos" && orders.length > 0 ? `${t.label} · ${orders.length}` : t.label,
  }));

  return (
    <div className="space-y-6 mx-auto max-w-[1400px]">
      <PageHeader
        icon={BarChart2}
        title="Analytics ML"
        description="Vendas, estoque Full e KPIs financeiros"
      />

      {/* Filtros e ações */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="seg">
          <button type="button" aria-pressed={!unifiedView} onClick={() => setUnifiedView(false)} className="seg-btn">Loja</button>
          <button type="button" aria-pressed={unifiedView} onClick={() => setUnifiedView(true)} className="seg-btn">Todas</button>
        </div>
        <AccountSelect accounts={accounts} value={selectedAccount} onChange={setSelectedAccount} disabled={unifiedView} />
        <div className="seg">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={period === p.value && !customRange}
              onClick={() => handlePeriodChange(p.value)}
              className="seg-btn"
            >
              {p.label}
            </button>
          ))}
          <DateRangePicker value={customRange} onChange={handleCustomRange} />
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={generateAiAnalysis}
            disabled={loadingAI || loadingSummary || aiAlreadyUsedToday || !!customRange || (unifiedView ? accounts.length === 0 : !selectedAccount)}
            title={
              customRange
                ? "Análise IA indisponível para período personalizado. Selecione 7d, 15d, 30d ou 90d."
                : aiAlreadyUsedToday
                ? "Análise gerada hoje · disponível amanhã"
                : "Gerar análise com IA"
            }
            className="!border-glow/30 !text-glow hover:!bg-glow/10"
          >
            <Sparkles size={14} className={loadingAI ? "animate-pulse" : ""} />
            {loadingAI
              ? "Gerando…"
              : aiAlreadyUsedToday
              ? "IA usada hoje"
              : customRange
              ? "Análise IA indisponível"
              : `Análise IA · ${period}`}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSync(true)}
            disabled={syncing || (unifiedView ? accounts.length === 0 : !selectedAccount)}
            title="Re-processa 90 dias"
          >
            <RefreshCw size={13} /> Re-sync 90d
          </Button>
          <Button
            size="sm"
            onClick={() => handleSync(false)}
            disabled={syncing || (unifiedView ? accounts.length === 0 : !selectedAccount)}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando…" : (unifiedView ? "Sincronizar todas" : "Sincronizar")}
          </Button>
        </div>
      </div>

      <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />

      {/* Pedidos */}
      <div style={{ display: activeTab === "pedidos" ? "block" : "none" }} className="glass rounded-2xl p-5">
        <OrdersTab orders={orders} loading={loadingOrders} />
      </div>

      {/* Analytics */}
      <div className="space-y-5" style={{ display: activeTab === "analytics" ? "block" : "none" }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={DollarSign}   label="Faturamento"      value={loadingSummary ? "…" : formatBRL(summary?.faturamento)}      sub="Pedidos pagos no período"                   tone="neon" />
          <KpiCard icon={TrendingUp}   label="Liq. Marketplace" value={loadingSummary ? "…" : formatBRL(summary?.liq_marketplace)}  sub={`Taxa ML: ${formatBRL(summary?.taxa_ml)}`} tone="brand" />
          <KpiCard icon={ShoppingCart} label="Pedidos"          value={loadingSummary ? "…" : (summary?.pedidos ?? "—")}            sub="Pedidos pagos"                              tone="violet" />
          <KpiCard icon={Package}      label="Ticket Médio"     value={loadingSummary ? "…" : formatBRL(summary?.ticket_medio)}                                                      tone="warn" />
        </div>

        <div className="glass hud-corners rounded-2xl p-5 md:p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-semibold text-fg">Receita e pedidos diários</h2>
              <p className="text-xs text-fg-dim mt-0.5">{unifiedView ? "Todas as lojas — receita bruta e volume de pedidos" : "Período selecionado — receita bruta e volume de pedidos"}</p>
            </div>
            {!loadingChart && chartData.length > 0 && (
              <span className="shrink-0 text-xs font-medium text-neon bg-neon/10 ring-1 ring-inset ring-neon/25 px-3 py-1 rounded-full">
                <span className="num">{daysWithSales}</span> dias com vendas
              </span>
            )}
          </div>
          {loadingChart ? (
            <div className="h-64 flex items-center justify-center text-fg-dim text-sm">
              <RefreshCw size={18} className="animate-spin mr-2" /> Carregando…
            </div>
          ) : chartData.length === 0 ? (
            <EmptyState icon={BarChart2} title="Nenhum dado para o período" description="Sincronize a conta ou escolha outro período." />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                {ChartGlowDefs()}
                <CartesianGrid {...chartGrid} />
                <XAxis
                  dataKey="date"
                  {...chartAxis}
                  tickFormatter={(d) => { try { return format(parseISO(d), "dd/MM", { locale: ptBR }); } catch { return d; } }}
                  interval="preserveStartEnd"
                />
                <YAxis yAxisId="left" {...chartAxis} tickFormatter={(v) => v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v}`} width={52} />
                <YAxis yAxisId="right" orientation="right" {...chartAxis} allowDecimals={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgb(var(--glow) / 0.35)", strokeWidth: 1 }} wrapperStyle={{ outline: "none" }} />
                {avgReceita > 0 && (
                  <ReferenceLine yAxisId="left" y={avgReceita} stroke={chartColors.neon} strokeDasharray="6 4" strokeOpacity={0.4}
                    label={{ value: "Média", position: "insideTopRight", fontSize: 10, fill: chartColors.neon, opacity: 0.7 }}
                  />
                )}
                <Bar yAxisId="right" dataKey="pedidos" name="pedidos" fill={chartColors.brand} fillOpacity={0.55} radius={[3,3,0,0]} maxBarSize={14} />
                <Area yAxisId="left" type="monotone" dataKey="receita" name="receita" stroke={chartColors.neon} strokeWidth={2.2} fill="url(#area-neon)" filter="url(#neon-glow)" dot={false} activeDot={neonActiveDot(chartColors.neon)} />
                <Legend verticalAlign="bottom" height={28} {...chartLegendProps}
                  formatter={(value) => <span className="text-xs text-fg-muted">{value === "receita" ? "Receita (R$)" : "Pedidos"}</span>}
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
