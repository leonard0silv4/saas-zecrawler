import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, Minus, Zap, ArrowRight } from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import SEO from "../components/SEO";
import api from "../services/api";
import { PLANS_META } from "../config/plansMeta";

// Ordem de exibição dos módulos na tabela comparativa (rótulos vêm da API, de MODULES.<key>.name)
const MODULE_ORDER = ["links", "priceAnalyze", "sellerMonitor", "catalog", "meli", "meliAnalytics", "meliCatalog", "meliMessages"];

// Alguns módulos diferenciam planos por um número, não só por liberado/bloqueado —
// essas células viram texto em vez de check/x, reaproveitando o limite numérico do plano.
const MODULE_CELL_OVERRIDES = {
  meli: (plan) => {
    const n = plan?.maxMeliAccounts;
    if (!n) return false;
    return n === 1 ? "1 conta" : `Até ${n}`;
  },
  meliMessages: (plan) => {
    const n = plan?.maxMonthlyMessages;
    if (n === 0 || n === undefined) return false;
    return n === null ? "Ilimitado" : `Até ${n}/mês`;
  },
};

function buildFeatureRows(plans, modules) {
  const planBySlug = Object.fromEntries(plans.map((p) => [p.slug, p]));
  const moduleRows = MODULE_ORDER.filter((key) => modules[key]).map((key) => {
    const mod = modules[key];
    const override = MODULE_CELL_OVERRIDES[key];
    const cell = (slug) => {
      if (!mod.plans.includes(slug)) return false;
      return override ? override(planBySlug[slug]) : true;
    };
    return { label: mod.name, free: cell("free"), starter: cell("starter"), pro: cell("pro"), business: cell("business") };
  });

  return [
    {
      category: "Recursos",
      features: [
        { label: "Dashboard", free: "Básico", starter: "Completo", pro: "Completo", business: "Completo" },
        ...moduleRows,
      ],
    },
    {
      category: "Limites",
      features: [
        { label: "Links monitorados", free: String(planBySlug.free?.maxLinks ?? "-"), starter: String(planBySlug.starter?.maxLinks ?? "-"), pro: String(planBySlug.pro?.maxLinks ?? "-"), business: String(planBySlug.business?.maxLinks ?? "-") },
        { label: "Sellers monitorados", free: String(planBySlug.free?.maxSellerMonitors ?? "-"), starter: String(planBySlug.starter?.maxSellerMonitors ?? "-"), pro: String(planBySlug.pro?.maxSellerMonitors ?? "-"), business: String(planBySlug.business?.maxSellerMonitors ?? "-") },
        { label: "Usuários no time", free: String(planBySlug.free?.maxTeamUsers ?? "-"), starter: String(planBySlug.starter?.maxTeamUsers ?? "-"), pro: String(planBySlug.pro?.maxTeamUsers ?? "-"), business: String(planBySlug.business?.maxTeamUsers ?? "-") },
        { label: "Times", free: String(planBySlug.free?.maxTeams ?? "-"), starter: String(planBySlug.starter?.maxTeams ?? "-"), pro: String(planBySlug.pro?.maxTeams ?? "-"), business: String(planBySlug.business?.maxTeams ?? "-") },
      ],
    },
  ];
}

function CellValue({ value }) {
  if (value === true)  return <Check size={18} className="text-emerald-500 mx-auto" />;
  if (value === false) return <X size={16} className="text-gray-300 mx-auto" />;
  if (value === null)  return <Minus size={16} className="text-gray-300 mx-auto" />;
  return <span className="text-sm font-medium text-gray-700">{value}</span>;
}

export default function PublicPricingPage() {
  const [plans, setPlans] = useState([]);
  const [modules, setModules] = useState({});

  useEffect(() => {
    api
      .get("/plans")
      .then((r) => {
        setPlans(Object.values(r.data.plans));
        setModules(r.data.modules);
      })
      .catch(() => {});
  }, []);

  const featureRows = buildFeatureRows(plans, modules);

  return (
    <PublicLayout noPadding>
      <SEO
        title="Planos e Preços"
        description="Free, Starter, Pro ou Business: escolha o plano ideal para alavancar suas vendas no Mercado Livre."
        canonical="/price"
      />
      <div className="px-4 py-12 max-w-6xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 bg-brand-100 text-brand-700 text-xs font-semibold rounded-full mb-4 uppercase tracking-wider">
            Planos e Preços
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Escolha o plano ideal<br className="hidden sm:block" /> para o seu negócio
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Comece gratuitamente e evolua conforme sua operação cresce.
            Planos pagos incluem <strong className="text-gray-700">10 dias grátis</strong>. Cancele quando quiser, sem multas.
          </p>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {plans.map((plan) => {
            const meta = PLANS_META[plan.slug] ?? PLANS_META.free;
            return (
              <div
                key={plan.slug}
                className={`relative bg-white rounded-2xl border-2 ${meta.accent} p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow`}
              >
                {meta.publicBadge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full ${
                    plan.slug === "pro" ? "bg-brand-600 text-white" : "bg-amber-500 text-white"
                  }`}>
                    {meta.publicBadge}
                  </span>
                )}

                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${meta.bg}`}>
                  <Zap size={20} className={meta.textColor} />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>

                <div className="mb-5">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-gray-900">Grátis</span>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-gray-400">R$</span>
                        <span className="text-3xl font-bold text-gray-900">
                          {plan.price.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-sm text-gray-400">/mês</span>
                      </div>
                      {plan.trialDays > 0 && (
                        <p className="text-xs text-emerald-600 font-medium mt-1">
                          {plan.trialDays} dias grátis para começar
                        </p>
                      )}
                    </>
                  )}
                </div>

                <ul className="space-y-2 mb-6 flex-1 text-sm text-gray-600">
                  {plan.features?.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`w-full py-2.5 rounded-lg text-sm font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
                    plan.slug === "pro"
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : plan.slug === "free"
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.trialDays > 0 ? `Começar ${plan.trialDays} dias grátis` : "Começar agora"}
                  <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Tabela comparativa */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Comparação detalhada</h2>
            <p className="text-sm text-gray-500 mt-1">Veja exatamente o que cada plano inclui</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 w-1/3">Recurso</th>
                  {plans.map((plan) => {
                    const meta = PLANS_META[plan.slug] ?? PLANS_META.free;
                    return (
                      <th key={plan.slug} className="px-4 py-4 text-center w-1/6">
                        <span className={`text-sm font-bold ${meta.textColor}`}>{plan.name}</span>
                        <div className="text-xs text-gray-400 font-normal mt-0.5">
                          {plan.price === 0 ? "Grátis" : `R$ ${plan.price.toFixed(2).replace(".", ",")}/mês`}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {featureRows.map((group) => (
                  <>
                    <tr key={group.category} className="bg-gray-50">
                      <td colSpan={5} className="px-6 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {group.category}
                      </td>
                    </tr>
                    {group.features.map((row, i) => (
                      <tr
                        key={row.label}
                        className={`border-t border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/30"} hover:bg-brand-50/30 transition-colors`}
                      >
                        <td className="px-6 py-3.5 text-sm text-gray-700 font-medium">{row.label}</td>
                        <td className="px-4 py-3.5 text-center"><CellValue value={row.free} /></td>
                        <td className="px-4 py-3.5 text-center"><CellValue value={row.starter} /></td>
                        <td className="px-4 py-3.5 text-center bg-brand-50/40"><CellValue value={row.pro} /></td>
                        <td className="px-4 py-3.5 text-center"><CellValue value={row.business} /></td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA final */}
        <div className="text-center mt-14">
          <p className="text-gray-500 mb-4">Pronto para começar?</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl shadow-sm transition-colors"
          >
            <Zap size={18} />
            Criar conta grátis
          </Link>
          <p className="text-xs text-gray-400 mt-3">Sem cartão de crédito · 10 dias grátis nos planos pagos · Cancele quando quiser</p>
        </div>
      </div>
    </PublicLayout>
  );
}
