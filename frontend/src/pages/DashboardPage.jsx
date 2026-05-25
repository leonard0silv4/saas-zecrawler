import { useAuth } from "../contexts/AuthContext";
import { Link2, Package, ShoppingBag, Lock, LineChart, Store } from "lucide-react";
import { Link } from "react-router-dom";

const CARDS = [
  { module: "links", icon: Link2, label: "Links", desc: "Acompanhe preços de concorrentes", to: "/links", color: "bg-blue-500" },
  { module: "priceAnalyze", icon: LineChart, label: "Análise de preços", desc: "Grupos por SKU dos seus links", to: "/price-analyze", color: "bg-sky-500" },
  { module: "sellerMonitor", icon: Store, label: "Monitor sellers", desc: "Páginas de vendedores ML", to: "/seller-monitor", color: "bg-teal-500" },
  { module: "catalog", icon: Package, label: "Dimensões e Peso", desc: "Validação de pacotes e cálculo de peso cúbico", to: "/catalog", color: "bg-orange-500" },
  { module: "meli", icon: ShoppingBag, label: "Mercado Livre", desc: "Contas e produtos ML", to: "/meli", color: "bg-yellow-500" },
];

export default function DashboardPage() {
  const { user, canAccess, isBlockedByPlan } = useAuth();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Olá, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-gray-500 mt-1">
          Plano <span className="font-medium text-brand-600">{user?.planConfig?.name}</span>
          {" — "}{user?.planConfig?.maxLinks} links e {user?.planConfig?.maxSellerMonitors ?? 0} sellers monitorados
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((card) => {
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
              <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{card.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
              {planLocked       && <Lock size={14} className="absolute top-4 right-4 text-amber-500" />}
              {permissionLocked && <Lock size={14} className="absolute top-4 right-4 text-gray-400" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
