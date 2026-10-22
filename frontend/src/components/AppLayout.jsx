import { Link, useLocation, Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import {
  Link2, ShoppingBag, Package, Ruler,
  LogOut, LayoutDashboard, Crown, Lock, Menu, X, CreditCard,
  LineChart, Store, Settings, MessageCircle, Unplug, Users, Info, HelpCircle, BarChart2,
} from "lucide-react";
import { Suspense, useState } from "react";
import OnboardingModal from "./OnboardingModal";
import BrandLogo from "./BrandLogo";
import PageLoader from "./PageLoader";
import ThemeToggle from "./ThemeToggle";
import { GridBackground, LiveDot } from "./fx";

const NAV_GROUPS = [
  {
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", module: null, ownerOnly: false },
    ],
  },
  {
    label: "Módulos",
    items: [
      { to: "/links",          icon: Link2,         label: "Links",                   module: "links",         ownerOnly: false },
      { to: "/meli/analytics", icon: BarChart2,      label: "Analytics ML",            module: "meliAnalytics", ownerOnly: false },
      { to: "/meli/catalog-ml", icon: Package,      label: "Catálogo ML",             module: "meliCatalog",   ownerOnly: false },
      { to: "/meli/messages",  icon: MessageCircle,  label: "Mensagens ML",            module: "meliMessages",  ownerOnly: false },
      { to: "/price-analyze",  icon: LineChart,      label: "Análise de concorrência", module: "priceAnalyze",  ownerOnly: false },
      { to: "/seller-monitor", icon: Store,          label: "Monitor sellers",         module: "sellerMonitor", ownerOnly: false },
      { to: "/catalog",        icon: Ruler,          label: "Dimensões e Peso",        module: "catalog",       ownerOnly: false },
      { to: "/meli",           icon: Unplug,         label: "Contas conectadas",       module: "meli",          ownerOnly: false },
    ],
  },
  {
    label: "Conta",
    items: [
      { to: "/team",     icon: Users,    label: "Time & Permissões", module: null, ownerOnly: true  },
      { to: "/plans",    icon: Crown,    label: "Planos e Preços",   module: null, ownerOnly: true  },
      { to: "/settings", icon: Settings, label: "Configurações",     module: null, ownerOnly: false },
    ],
  },
];

// Títulos por rota (aba do navegador). Deriva dos itens de navegação + extras.
const ROUTE_TITLES = {
  ...Object.fromEntries(NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.to, i.label]))),
  "/ajuda": "Ajuda",
};

function routeLabelFor(pathname) {
  return (
    ROUTE_TITLES[pathname] ||
    // rotas aninhadas (ex.: /meli/analytics/...) → casa pelo prefixo mais longo
    Object.entries(ROUTE_TITLES)
      .filter(([to]) => pathname.startsWith(to))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1]
  );
}

function pageTitleFor(pathname) {
  const label = routeLabelFor(pathname);
  return label ? `${label} | ML SmartHub` : "ML SmartHub";
}

const planColors = {
  free:     "bg-ink/5 text-fg-muted ring-ink/10",
  starter:  "bg-brandSolid-500/15 text-brandSolid-300 ring-brandSolid-400/30",
  pro:      "bg-violet-500/15 text-violet-300 ring-violet-400/30",
  business: "bg-warn/10 text-warn ring-warn/30",
};

export default function AppLayout() {
  const { user, logout, canAccess, isBlockedByPlan, manageBilling, isOwner } = useAuth();
  const { hasAnyDot, hasMeliAccount } = useNotifications();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const plan = user?.effectivePlan || user?.plan || "free";
  const planLabel = user?.planConfig?.name || "Gratuito";
  const planBadge = planColors[plan] ?? planColors.free;
  const routeLabel = routeLabelFor(location.pathname);

  function NavItem({ item }) {
    if (item.ownerOnly && !isOwner) return null;

    const active = location.pathname === item.to;
    const locked = item.module && !canAccess(item.module);
    const planLocked = locked && isBlockedByPlan(item.module);
    const permissionLocked = locked && !planLocked;

    return (
      <Link
        to={planLocked ? "/plans" : item.to}
        onClick={(e) => {
          if (permissionLocked) e.preventDefault();
          setSidebarOpen(false);
        }}
        aria-current={active ? "page" : undefined}
        className={[
          "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
          active
            ? "bg-gradient-to-r from-brandSolid-500/20 to-brandSolid-500/[0.02] text-fg font-medium"
            : "text-fg-muted hover:text-fg hover:bg-ink/[0.04]",
          locked ? "opacity-50 cursor-default" : "",
        ].join(" ")}
      >
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-glow shadow-[0_0_12px_2px_rgb(var(--glow)/0.7)]" />
        )}
        <item.icon
          size={17}
          className={active ? "text-glow drop-shadow-[0_0_6px_rgb(var(--glow)/0.8)]" : "text-fg-dim group-hover:text-fg-muted"}
        />
        <span className="truncate">{item.label}</span>
        {item.module === "meliMessages" && hasAnyDot && !locked && (
          <span className="ml-auto w-2 h-2 rounded-full bg-danger shadow-[0_0_8px_rgb(var(--danger))] shrink-0" />
        )}
        {planLocked       && <Lock size={13} className="ml-auto text-warn shrink-0" />}
        {permissionLocked && <Lock size={13} className="ml-auto text-fg-dim shrink-0" />}
      </Link>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-void">
      <Helmet>
        <title>{pageTitleFor(location.pathname)}</title>
      </Helmet>

      <GridBackground />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-scrim/70 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 shrink-0
        border-r border-line/10 bg-surface/80 backdrop-blur-xl
        transform transition-transform duration-200 ease-out lg:translate-x-0
        ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-line/10">
            <Link to="/dashboard" onClick={() => setSidebarOpen(false)} aria-label="ML SmartHub — Dashboard">
              <BrandLogo size={30} />
            </Link>
            <button
              className="lg:hidden p-1.5 rounded-lg text-fg-dim hover:bg-ink/5 hover:text-fg transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {NAV_GROUPS.map((group, gi) => {
              const visibleItems = group.items.filter((item) => !item.ownerOnly || isOwner);
              if (visibleItems.length === 0) return null;
              return (
                <div key={gi} className={gi > 0 ? "mt-5" : ""}>
                  {group.label && (
                    <p className="px-3 mb-1.5 text-xs font-medium text-fg-dim">{group.label}</p>
                  )}
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavItem key={item.to} item={item} />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* User card */}
          <div className="p-3 border-t border-line/10 space-y-0.5">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-line/10 bg-ink/[0.03]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brandSolid-400 to-brandSolid-700 ring-1 ring-glow/40 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg truncate leading-tight">{user?.name}</p>
                <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ring-1 ring-inset ${planBadge}`}>
                  {planLabel}
                </span>
              </div>
            </div>

            {user?.hasSubscription && isOwner && (
              <button
                onClick={manageBilling}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-ink/[0.04] rounded-lg transition-colors"
              >
                <CreditCard size={15} />
                Assinatura
              </button>
            )}
            <Link
              to="/ajuda"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-ink/[0.04] rounded-lg transition-colors"
            >
              <HelpCircle size={15} />
              Ajuda
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-fg-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
            >
              <LogOut size={15} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="flex items-center h-14 lg:h-16 px-4 lg:px-8 border-b border-line/10 bg-void/40 backdrop-blur-xl shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-fg-muted hover:bg-ink/5 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <span className="lg:hidden ml-2"><BrandLogo size={26} /></span>

          <p className="hidden lg:block font-display text-[15px] font-medium text-fg">{routeLabel ?? "ML SmartHub"}</p>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {hasMeliAccount ? (
              <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-neon/20 bg-neon/5 px-3 py-1 text-xs text-neon/90">
                <LiveDot />
                Mercado Livre conectado
              </span>
            ) : (
              <Link
                to="/meli"
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-warn/30 bg-warn/10 px-3 py-1 text-xs text-warn hover:bg-warn/15 transition-colors"
              >
                <LiveDot tone="warn" />
                Mercado Livre desconectado
              </Link>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Conta ML banner (informativo) */}
        {isOwner && !hasMeliAccount && (
          <div className="shrink-0 border-b border-warn/20 bg-warn/[0.07] px-4 lg:px-8 py-2.5 flex items-center gap-3 text-sm text-fg/90">
            <Info size={15} className="shrink-0 text-warn" />
            <span>Conecte ao menos 1 conta do Mercado Livre para usar Links, Análise de Preços e Monitor de Sellers.</span>
            <Link
              to="/meli"
              className="ml-auto shrink-0 px-3 py-1 rounded-lg border border-warn/40 bg-warn/15 text-warn text-xs font-semibold hover:bg-warn/25 transition-colors"
            >
              Conectar conta
            </Link>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <OnboardingModal />
    </div>
  );
}
