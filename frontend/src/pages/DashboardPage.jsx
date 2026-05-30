import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Link2, Package, ShoppingBag, Lock, LineChart as LineChartIcon,
  Store, BarChart2, TrendingUp, TrendingDown, MessageSquare,
  Clock, Zap, Users, RefreshCw, ArrowRight, Award, Tag, Bell, Activity,
  Sparkles, ArrowUpRight, ArrowDownRight, AlertTriangle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { parseXML } from "../lib/priceAnalyzeXml";
import { useMyStores } from "../hooks/useMyStores";

// ── Module navigation cards ────────────────────────────────────────────────

const MODULE_CARDS = [
  { module: "links", icon: Link2, label: "Links", desc: "Acompanhe preços de concorrentes", to: "/links", color: "bg-blue-500" },
  { module: "priceAnalyze", icon: LineChartIcon, label: "Análise de preços", desc: "Grupos por SKU dos seus links", to: "/price-analyze", color: "bg-sky-500" },
  { module: "sellerMonitor", icon: Store, label: "Monitor sellers", desc: "Páginas de vendedores ML", to: "/seller-monitor", color: "bg-teal-500" },
  { module: "catalog", icon: Package, label: "Dimensões e Peso", desc: "Validação de pacotes e cálculo de peso cúbico", to: "/catalog", color: "bg-orange-500" },
  { module: "meli", icon: ShoppingBag, label: "Mercado Livre", desc: "Contas e produtos ML", to: "/meli", color: "bg-yellow-500" },
  { module: "meliAnalytics", icon: BarChart2, label: "Analytics ML", desc: "Vendas, faturamento e estoque Full", to: "/meli/analytics", color: "bg-green-600" },
];

// ── Catalog stats helper ───────────────────────────────────────────────────

function computeCatalogStats(productGroups) {
  let winning = 0;
  let losing = 0;
  let reprecificacoes = 0;
  let totalDiff = 0;
  let diffCount = 0;

  for (const g of productGroups) {
    if (g.recommendation) reprecificacoes++;

    const myProducts = g.products.filter((p) => p.isMyStore);
    const compPrices = g.competitorPrices;

    if (myProducts.length === 0) continue;

    const myMin = Math.min(...myProducts.map((p) => p.preco));

    if (compPrices.length === 0) {
      winning++;
    } else {
      const compMin = Math.min(...compPrices);
      const diff = ((myMin - compMin) / compMin) * 100;
      totalDiff += diff;
      diffCount++;
      if (myMin <= compMin) winning++;
      else losing++;
    }
  }

  const myGroups = winning + losing;
  return {
    total: productGroups.length,
    winning,
    losing,
    taxaVitoria: myGroups > 0 ? (winning / myGroups) * 100 : 0,
    difMedia: diffCount > 0 ? totalDiff / diffCount : 0,
    reprecificacoes,
  };
}

// ── Shared components ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, iconColor = "text-gray-600", iconBg = "bg-gray-100", trend }) {
  return (
    <div className="group relative rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
            trend.direction === "up" ? "bg-green-50 text-green-700" :
            trend.direction === "down" ? "bg-red-50 text-red-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {trend.direction === "up" && <ArrowUpRight size={12} />}
            {trend.direction === "down" && <ArrowDownRight size={12} />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value ?? "—"}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function StatCardSkeleton() {
  return <div className="h-[124px] animate-pulse rounded-2xl border border-gray-200/70 bg-gray-100/70" />;
}

function SectionHeader({ title, to, linkLabel = "Ver todos", icon: Icon, accent = "bg-brand-500" }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-white ${accent}`}>
            <Icon size={15} />
          </span>
        ) : (
          <span className={`h-5 w-1 rounded-full ${accent}`} />
        )}
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      <Link
        to={to}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
      >
        {linkLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function SectionWrap({ children }) {
  return (
    <section className="space-y-4 rounded-3xl border border-gray-200/60 bg-gray-50/60 p-5">
      {children}
    </section>
  );
}

function Panel({ title, icon: Icon, children, className }) {
  return (
    <div className={`rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm${className ? ` ${className}` : ""}`}>
      <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        {Icon && <Icon size={15} className="text-gray-400" />}
        {title}
      </p>
      {children}
    </div>
  );
}

function RankList({ items, emptyText, badgeColor = "bg-brand-50 text-brand-700", nameKey = "name", valueKey }) {
  if (!items?.length) {
    return <p className="text-xs text-gray-400">{emptyText}</p>;
  }
  return (
    <ol className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-gray-50">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeColor}`}>
              {i + 1}
            </span>
            <span className="truncate font-medium text-gray-700">{item[nameKey] || "—"}</span>
          </span>
          <span className="ml-2 shrink-0 font-semibold tabular-nums text-gray-500">{item[valueKey]}</span>
        </li>
      ))}
    </ol>
  );
}

// ── Chart helpers ──────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label, total }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2.5 text-[11px] shadow-xl">
      {label && <p className="mb-1 text-[10px] text-gray-400">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="my-0.5">
          {p.name}: <strong className="text-white">
            {p.value}{total ? ` (${((p.value / total) * 100).toFixed(1)}%)` : ""}
          </strong>
        </p>
      ))}
    </div>
  );
}

function WinLossBar({ winning, losing, total, winColor = "#10b981", loseColor = "#ef4444" }) {
  if (!total) return <p className="text-xs text-gray-400">Nenhum dado disponível</p>;
  const winPct = (winning / total) * 100;
  const losePct = (losing / total) * 100;
  const neutralPct = Math.max(0, 100 - winPct - losePct);
  const neutral = total - winning - losing;

  return (
    <div>
      <div className="flex h-8 gap-px overflow-hidden rounded-xl">
        {winPct > 0 && (
          <div
            className="flex items-center justify-center transition-all"
            style={{ width: `${winPct}%`, background: winColor }}
          >
            {winPct >= 12 && (
              <span className="text-white text-xs font-semibold">{winPct.toFixed(0)}%</span>
            )}
          </div>
        )}
        {neutralPct > 0 && (
          <div className="bg-gray-200/80" style={{ width: `${neutralPct}%` }} />
        )}
        {losePct > 0 && (
          <div
            className="flex items-center justify-center transition-all"
            style={{ width: `${losePct}%`, background: loseColor }}
          >
            {losePct >= 12 && (
              <span className="text-white text-xs font-semibold">{losePct.toFixed(0)}%</span>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: winColor }} />
          <span>Ganhando: <strong className="text-gray-700">{winning}</strong></span>
        </div>
        {neutral > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-gray-300" />
            <span>Sem comparação: <strong className="text-gray-700">{neutral}</strong></span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: loseColor }} />
          <span>Perdendo: <strong className="text-gray-700">{losing}</strong></span>
        </div>
      </div>
    </div>
  );
}

// ── Links section ──────────────────────────────────────────────────────────

function LinksSection({ stats, loading }) {
  const cards = [
    {
      icon: Link2, label: "Total de Links",
      value: stats?.total,
      iconBg: "bg-blue-50", iconColor: "text-blue-600",
    },
    {
      icon: TrendingUp, label: "Links Ganhando",
      value: stats?.winning,
      sub: stats?.total ? `${((stats.winning / stats.total) * 100).toFixed(1)}% do total` : null,
      iconBg: "bg-green-50", iconColor: "text-green-600",
      trend: { value: "Ganhando", direction: "up" },
    },
    {
      icon: TrendingDown, label: "Links Perdendo",
      value: stats?.losing,
      sub: stats?.total ? `${((stats.losing / stats.total) * 100).toFixed(1)}% do total` : null,
      iconBg: "bg-red-50", iconColor: "text-red-600",
    },
    {
      icon: Award, label: "Competitividade Hoje",
      value: stats?.competitividade != null ? `${stats.competitividade.toFixed(1)}%` : "—",
      sub: "ganhando vs perdendo",
      iconBg: "bg-brand-50", iconColor: "text-brand-600",
    },
  ];

  return (
    <SectionWrap>
      <SectionHeader title="Links Monitorados" to="/links" icon={Link2} accent="bg-blue-500" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      {!loading && (
        <Panel title="Competitividade: Ganhando vs Perdendo">
          {stats?.total ? (
            <WinLossBar winning={stats.winning} losing={stats.losing} total={stats.total} />
          ) : (
            <div className="flex h-20 items-center justify-center text-sm text-gray-400">
              Nenhum link cadastrado ainda
            </div>
          )}
        </Panel>
      )}
    </SectionWrap>
  );
}

// ── Mensagens ML section ───────────────────────────────────────────────────

function MensagensMlSection({ stats, loading, isBusiness }) {
  if (!isBusiness) {
    return (
      <SectionWrap>
        <SectionHeader title="Mensagens ML" to="/meli/messages" linkLabel="Abrir mensagens" icon={MessageSquare} accent="bg-amber-500" />
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <Lock size={22} className="text-amber-500" />
          </div>
          <p className="text-gray-600 font-medium">Disponível no plano Business</p>
          <p className="text-sm text-gray-400 text-center max-w-sm">
            Gerencie perguntas do Mercado Livre com análise de desempenho da equipe
          </p>
          <Link
            to="/plans"
            className="mt-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
          >
            Ver planos
          </Link>
        </div>
      </SectionWrap>
    );
  }

  const cards = [
    {
      icon: MessageSquare, label: "Total de Perguntas",
      value: stats?.total,
      iconBg: "bg-blue-50", iconColor: "text-blue-600",
    },
    {
      icon: TrendingUp, label: "Taxa de Resposta",
      value: stats?.responseRate != null ? `${stats.responseRate.toFixed(1)}%` : "—",
      sub: `${stats?.answered ?? 0} de ${stats?.total ?? 0} respondidas`,
      iconBg: "bg-green-50", iconColor: "text-green-600",
      trend: { value: "Ótimo", direction: "up" },
    },
    {
      icon: Clock, label: "Tempo Médio",
      value: stats?.avgResponseMinutes != null ? `${stats.avgResponseMinutes}min` : "—",
      sub: "últimos 7 dias",
      iconBg: "bg-amber-50", iconColor: "text-amber-600",
    },
    {
      icon: Zap, label: "Pico de Mensagens",
      value: stats?.peakHour != null ? `${stats.peakHour}h` : "—",
      sub: "hora com mais perguntas",
      iconBg: "bg-brand-50", iconColor: "text-brand-600",
    },
  ];

  const hourlyData = stats?.questionsByHour
    ? stats.questionsByHour.map((count, h) => ({ hora: `${h}h`, Perguntas: count }))
    : [];

  return (
    <SectionWrap>
      <SectionHeader title="Mensagens ML" to="/meli/messages" linkLabel="Abrir mensagens" icon={MessageSquare} accent="bg-amber-500" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Perguntas por Horário" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData} barCategoryGap="20%">
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="hora"
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<DarkTooltip />}
                  cursor={{ fill: "rgba(0,112,199,0.06)" }}
                />
                <Bar dataKey="Perguntas" fill="#0070c7" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Top Respondedores" icon={Users}>
            <RankList
              items={stats?.topRespondedores}
              emptyText="Nenhum dado ainda. Os respondedores aparecerão aqui conforme as mensagens forem respondidas."
              badgeColor="bg-brand-50 text-brand-700"
              nameKey="name"
              valueKey="answered"
            />
          </Panel>
        </div>
      )}
    </SectionWrap>
  );
}

// ── Price Analyze section ──────────────────────────────────────────────────

function PriceAnalyzeSection({ xmlStats, loading, noStores }) {
  const cards = [
    {
      icon: BarChart2, label: "Total Catálogos",
      value: xmlStats?.total,
      iconBg: "bg-blue-50", iconColor: "text-blue-600",
    },
    {
      icon: Award, label: "Taxa Vitória",
      value: xmlStats?.taxaVitoria != null ? `${xmlStats.taxaVitoria.toFixed(1)}%` : "—",
      sub: `${xmlStats?.winning ?? 0} grupos ganhando`,
      iconBg: "bg-green-50", iconColor: "text-green-600",
      trend: { value: "Vitória", direction: "up" },
    },
    {
      icon: TrendingDown, label: "Dif. Média",
      value: xmlStats?.difMedia != null
        ? `${xmlStats.difMedia > 0 ? "+" : ""}${xmlStats.difMedia.toFixed(1)}%`
        : "—",
      sub: "vs menor preço concorrente",
      iconBg: "bg-amber-50", iconColor: "text-amber-600",
      trend: xmlStats?.difMedia != null
        ? { value: `${Math.abs(xmlStats.difMedia).toFixed(1)}%`, direction: xmlStats.difMedia <= 0 ? "down" : "up" }
        : undefined,
    },
    {
      icon: RefreshCw, label: "Reprecificações",
      value: xmlStats?.reprecificacoes,
      sub: "sugestões de ajuste",
      iconBg: "bg-orange-50", iconColor: "text-orange-600",
    },
  ];

  return (
    <SectionWrap>
      <SectionHeader title="Análise de Concorrência" to="/price-analyze" linkLabel="Ver análise" icon={BarChart2} accent="bg-sky-500" />
      {noStores && !loading && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
          <span>
            Suas lojas não estão configuradas — os dados de vitória/derrota podem estar incorretos.{" "}
            <Link to="/settings" className="font-semibold underline hover:text-amber-900">
              Ir para Configurações
            </Link>
          </span>
        </div>
      )}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : xmlStats === null || xmlStats === undefined ? (
        <div className="py-10 text-center text-gray-400">
          <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma análise gerada ainda.</p>
          <Link to="/price-analyze" className="text-sm text-brand-600 hover:underline">
            Gerar análise de preços
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((c) => <StatCard key={c.label} {...c} />)}
          </div>
          <Panel title="Catálogos: Ganhando vs Perdendo">
            <WinLossBar
              winning={xmlStats.winning}
              losing={xmlStats.losing}
              total={xmlStats.total}
              winColor="#6366f1"
              loseColor="#f59e0b"
            />
          </Panel>
        </>
      )}
    </SectionWrap>
  );
}

// ── Seller Monitor section ─────────────────────────────────────────────────

function SellerSection({ stats, loading }) {
  const cards = [
    {
      icon: Store, label: "Sellers Ativos",
      value: stats ? `${stats.active}/${stats.total}` : "—",
      iconBg: "bg-teal-50", iconColor: "text-teal-600",
    },
    {
      icon: Bell, label: "Mudanças Hoje",
      value: stats?.alertsToday,
      iconBg: "bg-amber-50", iconColor: "text-amber-600",
    },
    {
      icon: Tag, label: "Preços",
      value: stats?.priceChangesToday,
      sub: "alertas de preço hoje",
      iconBg: "bg-blue-50", iconColor: "text-blue-600",
    },
    {
      icon: Package, label: "Estoque",
      value: stats?.stockChangesToday,
      sub: "novos produtos hoje",
      iconBg: "bg-brand-50", iconColor: "text-brand-600",
    },
  ];

  return (
    <SectionWrap>
      <SectionHeader title="Monitor Sellers" to="/seller-monitor" linkLabel="Ver sellers" icon={Store} accent="bg-teal-500" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Mudanças nos Anúncios (15 dias)" className="lg:col-span-2">
            {(stats?.alertsByDay?.length ?? 0) === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                Sem dados de alterações ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={stats.alertsByDay}>
                  <defs>
                    <linearGradient id="gradMudancas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Mudanças"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    fill="url(#gradMudancas)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#14b8a6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>
          <Panel title="Sellers com mais mudanças" icon={Activity}>
            <RankList
              items={stats?.topSellers}
              emptyText="Nenhuma mudança nas últimas 24h"
              badgeColor="bg-teal-50 text-teal-700"
              nameKey="name"
              valueKey="alertsToday"
            />
          </Panel>
        </div>
      )}
    </SectionWrap>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, canAccess, isBlockedByPlan } = useAuth();

  const plan = user?.effectivePlan || user?.plan || "free";
  const isPaid = ["starter", "pro", "business"].includes(plan);
  const isBusiness = plan === "business";

  const { myStores, loading: storesLoading } = useMyStores();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [xmlStats, setXmlStats] = useState(undefined);
  const [xmlLoading, setXmlLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/dashboard/stats");
      setStats(data);
      setLastUpdated(new Date());
    } catch {
      // silent on polling failures
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    if (!isPaid || storesLoading) return;
    setXmlLoading(true);
    const token = localStorage.getItem("token");
    fetch("/api/price-analyze/xml", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) { setXmlStats(null); return; }
        const text = await res.text();
        try {
          const { productGroups } = parseXML(text, myStores);
          setXmlStats(computeCatalogStats(productGroups));
        } catch {
          setXmlStats(null);
        }
      })
      .catch(() => setXmlStats(null))
      .finally(() => setXmlLoading(false));
  }, [isPaid, myStores, storesLoading]);

  return (
    <div className="mx-auto space-y-8">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Olá, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="mt-1 text-sm text-brand-100">
              Aqui está o resumo da sua operação hoje.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-semibold backdrop-blur">
                <Sparkles size={13} /> Plano {user?.planConfig?.name}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-brand-100">
                {user?.planConfig?.maxLinks} links
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-brand-100">
                {user?.planConfig?.maxSellerMonitors ?? 0} sellers
              </span>
            </div>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-brand-100 backdrop-blur">
              <RefreshCw size={12} />
              Atualizado às{" "}
              {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      </div>

      {/* Module navigation cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Módulos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULE_CARDS.map((card) => {
            const locked = !canAccess(card.module);
            const planLocked = locked && isBlockedByPlan(card.module);
            const permissionLocked = locked && !planLocked;
            return (
              <Link
                key={card.to}
                to={planLocked ? "/plans" : card.to}
                onClick={(e) => { if (permissionLocked) e.preventDefault(); }}
                className={`group relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md ${locked ? "cursor-default opacity-60 hover:translate-y-0 hover:shadow-sm" : ""}`}
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm ${card.color}`}>
                  <card.icon size={20} />
                </div>
                <h3 className="font-semibold text-gray-900 transition-colors group-hover:text-brand-700">
                  {card.label}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{card.desc}</p>
                {planLocked && <Lock size={14} className="absolute top-4 right-4 text-amber-500" />}
                {permissionLocked && <Lock size={14} className="absolute top-4 right-4 text-gray-400" />}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Dashboard sections */}
      <LinksSection stats={stats?.links} loading={statsLoading} />

      {isPaid && (
        <>
          <MensagensMlSection
            stats={stats?.messages}
            loading={statsLoading}
            isBusiness={isBusiness}
          />
          <PriceAnalyzeSection xmlStats={xmlStats} loading={xmlLoading} noStores={!storesLoading && myStores.length === 0} />
          <SellerSection stats={stats?.sellers} loading={statsLoading} />
        </>
      )}
    </div>
  );
}
