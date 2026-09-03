import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Link2, Package, ShoppingBag, Lock, LineChart as LineChartIcon,
  Store, BarChart2, Sparkles, RefreshCw, MessageCircle, LayoutGrid,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { parseXML } from "../lib/priceAnalyzeXml";
import { useMyStores } from "../hooks/useMyStores";
import { LinksSection } from "../components/dashboard/LinksSection";
import { MensagensMlSection } from "../components/dashboard/MensagensMlSection";
import { PriceAnalyzeSection } from "../components/dashboard/PriceAnalyzeSection";
import { SellerSection } from "../components/dashboard/SellerSection";

const MODULE_CARDS = [
  { module: "links", icon: Link2, label: "Links", desc: "Acompanhe preços de concorrentes", to: "/links", color: "bg-blue-500" },
  { module: "priceAnalyze", icon: LineChartIcon, label: "Análise de preços", desc: "Grupos por SKU dos seus links", to: "/price-analyze", color: "bg-sky-500" },
  { module: "sellerMonitor", icon: Store, label: "Monitor sellers", desc: "Páginas de vendedores ML", to: "/seller-monitor", color: "bg-teal-500" },
  { module: "catalog", icon: Package, label: "Dimensões e Peso", desc: "Validação de pacotes e cálculo de peso cúbico", to: "/catalog", color: "bg-orange-500" },
  { module: "meli", icon: ShoppingBag, label: "Mercado Livre", desc: "Contas e produtos ML", to: "/meli", color: "bg-yellow-500" },
  { module: "meliAnalytics", icon: BarChart2, label: "Analytics ML", desc: "Vendas, faturamento e estoque Full", to: "/meli/analytics", color: "bg-green-600" },
  { module: "meliCatalog", icon: LayoutGrid, label: "Catálogo ML", desc: "Catálogo de produtos do Mercado Livre", to: "/meli/catalog-ml", color: "bg-rose-500" },
  { module: "meliMessages", icon: MessageCircle, label: "Mensagens ML", desc: "Perguntas e respostas dos compradores", to: "/meli/messages", color: "bg-indigo-500" },
];

function computeCatalogStats(productGroups) {
  let winning = 0, losing = 0, reprecificacoes = 0, totalDiff = 0, diffCount = 0;
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
    winning, losing,
    taxaVitoria: myGroups > 0 ? (winning / myGroups) * 100 : 0,
    difMedia: diffCount > 0 ? totalDiff / diffCount : 0,
    reprecificacoes,
  };
}

export default function DashboardPage() {
  const { user, canAccess, isBlockedByPlan } = useAuth();
  const canPriceAnalyze = canAccess("priceAnalyze");
  const canSellerMonitor = canAccess("sellerMonitor");
  const canMeliMessages = canAccess("meliMessages");

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
    if (!canPriceAnalyze || storesLoading) return;
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
  }, [canPriceAnalyze, myStores, storesLoading]);

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

      {canMeliMessages && (
        <MensagensMlSection stats={stats?.messages} loading={statsLoading} />
      )}

      {canPriceAnalyze && (
        <PriceAnalyzeSection
          xmlStats={xmlStats}
          loading={xmlLoading}
          noStores={!storesLoading && myStores.length === 0}
        />
      )}

      {canSellerMonitor && (
        <SellerSection stats={stats?.sellers} loading={statsLoading} />
      )}
    </div>
  );
}
