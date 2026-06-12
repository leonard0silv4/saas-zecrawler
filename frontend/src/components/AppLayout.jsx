import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import {
  Link2, ShoppingBag, Package,
  LogOut, LayoutDashboard, Crown, Lock, Menu, X, CreditCard,
  LineChart, Store, Settings, MessageCircle, Unplug, Users, AlertTriangle, HelpCircle, BarChart2,
} from "lucide-react";
import { useState } from "react";
import OnboardingModal from "./OnboardingModal";

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
      { to: "/meli/catalog-ml", icon: Package,      label: "Catálogo ML",             module: "meliAnalytics", ownerOnly: false },
      { to: "/meli/messages",  icon: MessageCircle,  label: "Mensagens ML",            module: "meliMessages",  ownerOnly: false },
      { to: "/price-analyze",  icon: LineChart,      label: "Análise de concorrência", module: "priceAnalyze",  ownerOnly: false },
      { to: "/seller-monitor", icon: Store,          label: "Monitor sellers",         module: "sellerMonitor", ownerOnly: false },
      { to: "/catalog",        icon: Package,        label: "Dimensões e Peso",        module: "catalog",       ownerOnly: false },
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

const planColors = {
  free:     "bg-gray-100 text-gray-600",
  starter:  "bg-blue-100 text-blue-700",
  pro:      "bg-purple-100 text-purple-700",
  business: "bg-amber-100 text-amber-700",
};

export default function AppLayout() {
  const { user, logout, canAccess, isBlockedByPlan, manageBilling, isOwner } = useAuth();
  const { hasAnyDot, hasCookies } = useNotifications();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const plan = user?.effectivePlan || user?.plan || "free";
  const planLabel = user?.planConfig?.name || "Gratuito";
  const planBadge = planColors[plan] ?? planColors.free;

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
        className={[
          "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
          active
            ? "bg-brand-50 text-brand-700 border-l-[3px] border-brand-600 pl-[9px]"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-[3px] border-transparent pl-[9px]",
          locked ? "opacity-50 cursor-default" : "",
        ].join(" ")}
      >
        <item.icon size={17} className={active ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600"} />
        <span className="truncate">{item.label}</span>
        {item.module === "meliMessages" && hasAnyDot && !locked && (
          <span className="ml-auto w-2 h-2 rounded-full bg-red-500 shrink-0" />
        )}
        {planLocked       && <Lock size={13} className="ml-auto text-amber-500 shrink-0" />}
        {permissionLocked && <Lock size={13} className="ml-auto text-gray-400 shrink-0" />}
      </Link>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100
        transform transition-transform duration-200 ease-out lg:translate-x-0
        ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-[60px] border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="ML SmartHub" className="h-9 w-auto" />
              <span className="text-xs font-semibold text-gray-400 tracking-wide hidden lg:block">SmartHub</span>
            </div>
            <button
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
            {NAV_GROUPS.map((group, gi) => {
              const visibleItems = group.items.filter((item) => !item.ownerOnly || isOwner);
              if (visibleItems.length === 0) return null;
              return (
                <div key={gi}>
                  {gi > 0 && <hr className="my-2.5 border-gray-100" />}
                  {group.label && (
                    <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {group.label}
                    </p>
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
          <div className="p-3 border-t border-gray-100 space-y-0.5">
            {/* Identity row */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-bold shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{user?.name}</p>
                <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${planBadge}`}>
                  {planLabel}
                </span>
              </div>
            </div>

            {user?.hasSubscription && isOwner && (
              <button
                onClick={manageBilling}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
              >
                <CreditCard size={15} />
                Assinatura
              </button>
            )}
            <Link
              to="/ajuda"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
            >
              <HelpCircle size={15} />
              Ajuda
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut size={15} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center h-14 px-4 bg-white border-b border-gray-100 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          <img src="/logo.png" alt="ML SmartHub" className="ml-3 h-7 w-auto" />
        </header>

        {/* Cookie banner */}
        {isOwner && !hasCookies && (
          <div className="shrink-0 bg-red-600 px-4 py-2.5 flex items-center gap-3 text-sm text-white">
            <AlertTriangle size={15} className="shrink-0" />
            <span>Seus cookies do Mercado Livre não estão configurados. O sistema pode não funcionar corretamente.</span>
            <Link
              to="/setup-cookies"
              className="ml-auto shrink-0 px-3 py-1 rounded-lg bg-white text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
            >
              Configurar agora →
            </Link>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      <OnboardingModal />
    </div>
  );
}
