import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import {
  Link2, ShoppingBag, Package,
  LogOut, LayoutDashboard, Crown, Lock, Menu, X, CreditCard,
  LineChart, Store, Settings, MessageCircle, Unplug, Users, AlertTriangle, HelpCircle, BarChart2,
  Bell, Search,
} from "lucide-react";
import { useState } from "react";
import OnboardingModal from "./OnboardingModal";

const NAV = [
  { to: "/dashboard",      icon: LayoutDashboard, label: "Dashboard",               module: null,            ownerOnly: false },
  { to: "/links",          icon: Link2,           label: "Links",                   module: "links",         ownerOnly: false },
  { to: "/meli/analytics", icon: BarChart2,       label: "Analytics ML",            module: "meliAnalytics", ownerOnly: false },
  { to: "/price-analyze",  icon: LineChart,       label: "Análise de concorrência", module: "priceAnalyze",  ownerOnly: false },
  { to: "/seller-monitor", icon: Store,           label: "Monitor sellers",         module: "sellerMonitor", ownerOnly: false },
  { to: "/meli/messages",  icon: MessageCircle,   label: "Mensagens ML",            module: "meliMessages",  ownerOnly: false },
  { to: "/team",           icon: Users,           label: "Time & Permissões",       module: null,            ownerOnly: true  },
  { to: "/catalog",        icon: Package,         label: "Dimensões e Peso",        module: "catalog",       ownerOnly: false },
  { to: "/plans",          icon: Crown,           label: "Planos e Preços",         module: null,            ownerOnly: true  },
  { to: "/settings",       icon: Settings,        label: "Configurações",           module: null,            ownerOnly: false },
  { to: "/meli",           icon: Unplug,          label: "Contas conectadas",       module: "meli",          ownerOnly: false },
];

export default function AppLayout() {
  const { user, logout, canAccess, isBlockedByPlan, manageBilling, isOwner } = useAuth();
  const { hasAnyDot, hasCookies } = useNotifications();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const planColors = {
    free: "bg-gray-100 text-gray-600",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-purple-100 text-purple-700",
    business: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100/70">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-gray-900/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200
        transform transition-transform lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100">
            <img src="/logo.png" alt="ML SmartHub" className="h-8 w-auto" />
            <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV.map((item) => {
              if (item.ownerOnly && !isOwner) return null;

              const active = location.pathname === item.to;
              const locked = item.module && !canAccess(item.module);
              const planLocked = locked && isBlockedByPlan(item.module);
              const permissionLocked = locked && !planLocked;

              return (
                <Link
                  key={item.to}
                  to={planLocked ? "/plans" : item.to}
                  onClick={(e) => {
                    if (permissionLocked) e.preventDefault();
                    setSidebarOpen(false);
                  }}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
                    ${locked ? "opacity-50 cursor-default" : ""}
                  `}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {item.module === "meliMessages" && hasAnyDot && !locked && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  )}
                  {planLocked       && <Lock size={14} className="ml-auto text-amber-500" />}
                  {permissionLocked && <Lock size={14} className="ml-auto text-gray-400" />}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.planConfig?.name || "Gratuito"}</p>
              </div>
            </div>
            {user?.hasSubscription && isOwner && (
              <button
                onClick={manageBilling}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
              >
                <CreditCard size={16} />
                Assinatura
              </button>
            )}
            <Link
              to="/ajuda"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
            >
              <HelpCircle size={16} />
              Ajuda
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center h-14 px-4 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2">
            <Menu size={20} />
          </button>
          <img src="/logo.png" alt="ML SmartHub" className="ml-3 h-7 w-auto" />
        </header>

        {/* Top bar desktop */}
        {/* <header className="hidden lg:flex sticky top-0 z-30 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur md:px-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar produtos, links, sellers..."
              className="w-full max-w-md rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-300 focus:bg-white"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Notificações"
            >
              <Bell size={18} />
              {hasAnyDot && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header> */}

        {/* Banner: cookies ML não configurados */}
        {isOwner && !hasCookies && (
          <div className="bg-red-600 px-4 py-2.5 flex items-center gap-3 text-sm text-white">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              Seus cookies do Mercado Livre não estão configurados. O sistema pode não funcionar corretamente.
            </span>
            <Link
              to="/setup-cookies"
              className="ml-auto shrink-0 px-3 py-1 rounded-lg bg-white text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
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

      {/* Onboarding modal — aparece apenas na primeira visita */}
      <OnboardingModal />
    </div>
  );
}
