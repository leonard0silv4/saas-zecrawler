import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Link2, Package, ShoppingBag, Lock, LineChart as LineChartIcon,
  Store, BarChart2, TrendingUp, TrendingDown, MessageSquare,
  Clock, Zap, Users, RefreshCw, ArrowRight, Award, Tag, Bell, Activity,
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

function StatCard({ icon: Icon, label, value, sub, iconColor = "text-gray-600", iconBg = "bg-gray-50" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatCardSkeleton() {
  return <div className="bg-white rounded-xl border border-gray-100 p-4 h-28 animate-pulse" />;
}

function SectionHeader({ title, to, linkLabel = "Ver todos" }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <Link
        to={to}
        className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
      >
        {linkLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function SectionWrap({ children }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
      {children}
    </div>
  );
}

function RankList({ items, emptyText, badgeColor = "bg-brand-50 text-brand-700", nameKey = "name", valueKey }) {
  if (!items?.length) {
    return <p className="text-xs text-gray-400">{emptyText}</p>;
  }
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 min-w-0">
            <span className={`w-5 h-5 shrink-0 rounded-full text-xs font-bold flex items-center justify-center ${badgeColor}`}>
              {i + 1}
            </span>
            <span className="text-gray-700 font-medium truncate">{item[nameKey] || "—"}</span>
          </span>
          <span className="text-gray-500 font-semibold shrink-0 ml-2">{item[valueKey]}</span>
        </li>
      ))}
    </ol>
  );
}

// ── Chart helpers ──────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label, total }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", border: "none", borderRadius: 6, padding: "10px 12px", fontSize: 11 }}>
      {label && <p style={{ color: "#94a3b8", marginBottom: 4, fontSize: 10 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong style={{ color: "#fff" }}>
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
      <div className="flex h-7 rounded-xl overflow-hidden gap-px">
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
          <div className="bg-gray-100" style={{ width: `${neutralPct}%` }} />
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: winColor }} />
          <span>Ganhando: <strong className="text-gray-700">{winning}</strong></span>
        </div>
        {neutral > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
            <span>Sem comparação: <strong className="text-gray-700">{neutral}</strong></span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: loseColor }} />
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
      <SectionHeader title="Links Monitorados" to="/links" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">Competitividade: Ganhando vs Perdendo</p>
          {stats?.total ? (
            <WinLossBar winning={stats.winning} losing={stats.losing} total={stats.total} />
          ) : (
            <div className="h-20 flex items-center justify-center text-gray-400 text-sm">
              Nenhum link cadastrado ainda
            </div>
          )}
        </div>
      )}
    </SectionWrap>
  );
}

// ── Mensagens ML section ───────────────────────────────────────────────────

function MensagensMlSection({ stats, loading, isBusiness }) {
  if (!isBusiness) {
    return (
      <SectionWrap>
        <SectionHeader title="Mensagens ML" to="/meli/messages" linkLabel="Abrir mensagens" />
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
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
      iconBg: "bg-purple-50", iconColor: "text-purple-600",
    },
  ];

  const hourlyData = stats?.questionsByHour
    ? stats.questionsByHour.map((count, h) => ({ hora: `${h}h`, Perguntas: count }))
    : [];

  return (
    <SectionWrap>
      <SectionHeader title="Mensagens ML" to="/meli/messages" linkLabel="Abrir mensagens" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Perguntas por Horário</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="" stroke="#f1f5f9" vertical={false} />
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
                  cursor={{ fill: "rgba(148,163,184,0.08)" }}
                />
                <Bar dataKey="Perguntas" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
              <Users size={14} /> Top Respondedores
            </p>
            <RankList
              items={stats?.topRespondedores}
              emptyText="Nenhum dado ainda. Os respondedores aparecerão aqui conforme as mensagens forem respondidas."
              badgeColor="bg-brand-50 text-brand-700"
              nameKey="name"
              valueKey="answered"
            />
          </div>
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
    },
    {
      icon: TrendingDown, label: "Dif. Média",
      value: xmlStats?.difMedia != null
        ? `${xmlStats.difMedia > 0 ? "+" : ""}${xmlStats.difMedia.toFixed(1)}%`
        : "—",
      sub: "vs menor preço concorrente",
      iconBg: "bg-amber-50", iconColor: "text-amber-600",
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
      <SectionHeader title="Análise de Concorrência" to="/price-analyze" linkLabel="Ver análise" />
      {noStores && !loading && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <span className="mt-0.5">⚠️</span>
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
        <div className="text-center py-10 text-gray-400">
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
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-700 mb-4">Catálogos: Ganhando vs Perdendo</p>
            <WinLossBar
              winning={xmlStats.winning}
              losing={xmlStats.losing}
              total={xmlStats.total}
              winColor="#6366f1"
              loseColor="#f59e0b"
            />
          </div>
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
      iconBg: "bg-purple-50", iconColor: "text-purple-600",
    },
  ];

  return (
    <SectionWrap>
      <SectionHeader title="Monitor Sellers" to="/seller-monitor" linkLabel="Ver sellers" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Mudanças nos Anúncios (15 dias)</p>
            {(stats?.alertsByDay?.length ?? 0) === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                Sem dados de alterações ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={stats.alertsByDay}>
                  <defs>
                    <linearGradient id="gradMudancas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#gradMudancas)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#8b5cf6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
              <Activity size={14} /> Sellers com mais mudanças
            </p>
            <RankList
              items={stats?.topSellers}
              emptyText="Nenhuma mudança nas últimas 24h"
              badgeColor="bg-teal-50 text-teal-700"
              nameKey="name"
              valueKey="alertsToday"
            />
          </div>
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Plano{" "}
            <span className="font-medium text-brand-600">{user?.planConfig?.name}</span>
            {" — "}{user?.planConfig?.maxLinks} links e{" "}
            {user?.planConfig?.maxSellerMonitors ?? 0} sellers monitorados
          </p>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <RefreshCw size={12} />
            Atualizado às{" "}
            {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      {/* Module navigation cards */}
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
              className={`group relative bg-white rounded-xl border border-gray-100 p-5 transition-all hover:shadow-md hover:border-gray-200 ${locked ? "opacity-60 cursor-default" : ""}`}
            >
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-4`}>
                <card.icon size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
                {card.label}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
              {planLocked && <Lock size={14} className="absolute top-4 right-4 text-amber-500" />}
              {permissionLocked && <Lock size={14} className="absolute top-4 right-4 text-gray-400" />}
            </Link>
          );
        })}
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
