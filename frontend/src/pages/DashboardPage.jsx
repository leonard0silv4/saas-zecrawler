import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Link2, Package, ShoppingBag, Lock, LineChart as LineChartIcon,
  Store, BarChart2, Sparkles, MessageCircle, LayoutGrid,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { parseXML } from "../lib/priceAnalyzeXml";
import { useMyStores } from "../hooks/useMyStores";
import { LinksSection } from "../components/dashboard/LinksSection";
import { MensagensMlSection } from "../components/dashboard/MensagensMlSection";
import { PriceAnalyzeSection } from "../components/dashboard/PriceAnalyzeSection";
import { SellerSection } from "../components/dashboard/SellerSection";
import { HoloDeck } from "../components/dashboard/HoloDeck";
import { LiveDot } from "../components/fx";
import { useTheme } from "../contexts/ThemeContext";

// No tema claro os acentos ficam mais escuros para manter contraste sobre branco.
const LIGHT_ACCENT = {
  "#4a95ff": "#0f66e8", "#40c8ff": "#0284c7", "#2dd4bf": "#0d9488", "#ff9f43": "#c2410c",
  "#ffd23f": "#a16207", "#34f5a0": "#059669", "#ff5c8a": "#be185d", "#8b8cff": "#4f46e5",
};

const MODULE_CARDS = [
  { module: "links", icon: Link2, label: "Links", desc: "Acompanhe preços de concorrentes", to: "/links", accent: "#4a95ff" },
  { module: "priceAnalyze", icon: LineChartIcon, label: "Análise de preços", desc: "Grupos por SKU dos seus links", to: "/price-analyze", accent: "#40c8ff" },
  { module: "sellerMonitor", icon: Store, label: "Monitor sellers", desc: "Páginas de vendedores ML", to: "/seller-monitor", accent: "#2dd4bf" },
  { module: "catalog", icon: Package, label: "Dimensões e Peso", desc: "Validação de pacotes e cálculo de peso cúbico", to: "/catalog", accent: "#ff9f43" },
  { module: "meli", icon: ShoppingBag, label: "Mercado Livre", desc: "Contas e produtos ML", to: "/meli", accent: "#ffd23f" },
  { module: "meliAnalytics", icon: BarChart2, label: "Analytics ML", desc: "Vendas, faturamento e estoque Full", to: "/meli/analytics", accent: "#34f5a0" },
  { module: "meliCatalog", icon: LayoutGrid, label: "Catálogo ML", desc: "Catálogo de produtos do Mercado Livre", to: "/meli/catalog-ml", accent: "#ff5c8a" },
  { module: "meliMessages", icon: MessageCircle, label: "Mensagens ML", desc: "Perguntas e respostas dos compradores", to: "/meli/messages", accent: "#8b8cff" },
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
  const { theme } = useTheme();
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
    <div className="mx-auto max-w-[1400px] space-y-8">
      {/* Hero: saudação + painéis holográficos */}
      <div className="glass hud-corners relative overflow-hidden rounded-3xl px-6 pt-6 pb-4 lg:px-8 lg:pt-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 80% at 75% 100%, rgb(30 123 255 / 0.22), transparent 70%)" }}
        />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="pb-4 lg:pb-8">
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <LiveDot />
              {lastUpdated
                ? `Atualizado às ${lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "Carregando dados"}
            </p>
            <h1 className="mt-3 text-3xl lg:text-[2.6rem] font-semibold leading-[1.1] text-fg">
              Olá, {user?.name?.split(" ")[0]}
            </h1>
            <p className="mt-2 max-w-md text-fg-muted">
              Aqui está o resumo da sua operação hoje.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brandSolid-400/40 bg-brandSolid-500/15 px-3 py-1 font-medium text-brandSolid-200">
                <Sparkles size={13} /> Plano {user?.planConfig?.name}
              </span>
              <span className="rounded-full border border-line/15 bg-ink/[0.03] px-3 py-1 text-fg-muted">
                <span className="num text-fg">{user?.planConfig?.maxLinks}</span> links
              </span>
              <span className="rounded-full border border-line/15 bg-ink/[0.03] px-3 py-1 text-fg-muted">
                <span className="num text-fg">{user?.planConfig?.maxSellerMonitors ?? 0}</span> sellers
              </span>
            </div>
          </div>
          <HoloDeck stats={stats} loading={statsLoading} />
        </div>
      </div>

      {/* Module navigation cards */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-fg">Módulos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MODULE_CARDS.map((card) => {
            const locked = !canAccess(card.module);
            const planLocked = locked && isBlockedByPlan(card.module);
            const permissionLocked = locked && !planLocked;
            const accent = theme === "light" ? (LIGHT_ACCENT[card.accent] ?? card.accent) : card.accent;
            return (
              <Link
                key={card.to}
                to={planLocked ? "/plans" : card.to}
                onClick={(e) => { if (permissionLocked) e.preventDefault(); }}
                style={{ "--accent": accent }}
                className={`glass group relative flex items-start gap-3.5 overflow-hidden rounded-2xl p-4 transition-colors hover:border-line/30 ${locked ? "cursor-default opacity-50" : ""}`}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
                  style={{ background: accent }}
                />
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    color: accent,
                    borderColor: `${accent}55`,
                    background: `${accent}14`,
                    boxShadow: `0 0 18px -6px ${accent}`,
                  }}
                >
                  <card.icon size={19} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-fg">{card.label}</h3>
                  <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{card.desc}</p>
                </div>
                {planLocked && <Lock size={14} className="absolute top-4 right-4 text-warn" />}
                {permissionLocked && <Lock size={14} className="absolute top-4 right-4 text-fg-dim" />}
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
