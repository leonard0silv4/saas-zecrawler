import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { Check, Zap, CreditCard, Crown } from "lucide-react";
import api from "../services/api";
import { notifySuccess, notifyError } from "../utils/notify.js";
import { toast } from "sonner";
import { Alert } from "../components/ui/Alert";

const PLAN_ACCENT = ["border-gray-200", "border-blue-300", "border-violet-400", "border-amber-400"];
const PLAN_TOP    = ["bg-gray-300",     "bg-blue-400",     "bg-violet-500",     "bg-amber-400"   ];
const BADGES      = [null, null, "Mais popular", "Completo"];

export default function PlansPage() {
  const { user, isOwner } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans]     = useState({});
  const [subStatus, setSubStatus] = useState(null);
  const [upgrading, setUpgrading] = useState(null);

  useEffect(() => {
    api.get("/plans").then((r) => setPlans(r.data));
    api.get("/stripe/status").then((r) => setSubStatus(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      notifySuccess("Pagamento realizado! Seu plano foi atualizado.");
      setTimeout(() => window.location.reload(), 2000);
    } else if (status === "canceled") {
      toast("Pagamento cancelado. Seu plano não foi alterado.");
    }
    if (status) {
      searchParams.delete("status");
      searchParams.delete("session_id");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  async function handleUpgrade(slug) {
    if (slug === "free") {
      setUpgrading(slug);
      try {
        if (user?.hasSubscription) {
          await api.post("/stripe/downgrade");
          toast("Assinatura será cancelada ao fim do período atual.");
        } else {
          await api.put("/auth/plan", { plan: "free" });
          window.location.reload();
        }
      } catch (err) {
        notifyError(err.response?.data?.error || "Erro ao alterar plano");
      } finally {
        setUpgrading(null);
      }
      return;
    }
    setUpgrading(slug);
    try {
      const { data } = await api.post("/stripe/checkout", { planSlug: slug });
      if (data.url) { window.location.href = data.url; return; }
      if (data.updated) { notifySuccess("Plano atualizado!"); setTimeout(() => window.location.reload(), 1500); }
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao iniciar pagamento");
    } finally {
      setUpgrading(null);
    }
  }

  async function openPortal() {
    try {
      const { data } = await api.post("/stripe/portal");
      window.location.href = data.url;
    } catch {
      notifyError("Erro ao abrir portal de cobrança");
    }
  }

  const planList = Object.values(plans);
  const cancelPending = subStatus?.subscription?.cancelAtPeriodEnd;

  return (
    <div className="mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 mb-4">
          <Crown size={22} className="text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Planos e Preços</h1>
        <p className="text-gray-500 mt-1">Escolha o plano ideal para o seu negócio</p>
      </div>

      {/* Alerts */}
      {!isOwner && (
        <div className="mb-6 max-w-3xl mx-auto">
          <Alert variant="info">
            Somente o administrador da conta pode alterar o plano ou gerenciar a assinatura.
          </Alert>
        </div>
      )}
      {cancelPending && (
        <div className="mb-6 max-w-3xl mx-auto">
          <Alert variant="warning">
            Sua assinatura será cancelada em{" "}
            <strong>{new Date(subStatus.subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}</strong>.
            Você pode reativar no portal de cobrança.
          </Alert>
        </div>
      )}

      {/* Subscription status card */}
      {subStatus?.subscription && (
        <div className="mb-8 max-w-md mx-auto bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-900">Assinatura ativa</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              subStatus.subscription.status === "active"   ? "bg-emerald-50 text-emerald-700" :
              subStatus.subscription.status === "past_due" ? "bg-red-50 text-red-600" :
                                                             "bg-gray-100 text-gray-500"
            }`}>
              {subStatus.subscription.status === "active"   ? "Ativa" :
               subStatus.subscription.status === "past_due" ? "Pagamento pendente" :
               subStatus.subscription.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Plano <strong className="text-gray-800">{subStatus.planConfig?.name}</strong> — renova em{" "}
            {new Date(subStatus.subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
          </p>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
        {planList.map((plan, i) => {
          const isCurrent = (user?.effectivePlan || user?.plan) === plan.slug;
          const badge     = BADGES[i];
          const topColor  = PLAN_TOP[i]   ?? "bg-gray-300";
          const accent    = PLAN_ACCENT[i] ?? "border-gray-200";

          return (
            <div
              key={plan.slug}
              className={[
                "relative bg-white rounded-2xl border-2 flex flex-col overflow-hidden",
                isCurrent ? "border-brand-500 shadow-xl shadow-brand-100/60" : accent,
              ].join(" ")}
            >
              {/* Top color bar */}
              <div className={`h-1 w-full ${isCurrent ? "bg-brand-500" : topColor} shrink-0`} />

              {/* Badge */}
              {badge && (
                <span className="absolute top-4 right-4 bg-brand-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full ring-2 ring-brand-300 ring-offset-1">
                  {badge}
                </span>
              )}

              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-base font-bold text-gray-900 mb-3">{plan.name}</h3>

                {/* Price */}
                <div className="mb-4">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-gray-900">Grátis</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-gray-400">R$</span>
                      <span className="text-3xl font-bold text-gray-900">
                        {plan.price.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-sm text-gray-400">/mês</span>
                    </div>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-1 mb-5">
                  <p className="text-xs text-gray-500">
                    Até <strong className="text-gray-700">{plan.maxLinks.toLocaleString()}</strong> links
                  </p>
                  {plan.maxSellerMonitors != null && (
                    <p className="text-xs text-gray-500">
                      Até <strong className="text-gray-700">{plan.maxSellerMonitors.toLocaleString()}</strong>{" "}
                      {plan.maxSellerMonitors === 1 ? "seller monitorado" : "sellers monitorados"}
                    </p>
                  )}
                  {plan.maxTeamUsers != null && (
                    <p className="text-xs text-gray-500">
                      Até <strong className="text-gray-700">{plan.maxTeamUsers.toLocaleString()}</strong>{" "}
                      {plan.maxTeamUsers === 1 ? "usuário no time" : "usuários no time"}
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features?.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="text-center text-sm font-semibold text-brand-600 bg-brand-50 py-2.5 rounded-xl">
                    ✓ Plano atual
                  </div>
                ) : isOwner ? (
                  <button
                    onClick={() => handleUpgrade(plan.slug)}
                    disabled={!!upgrading}
                    className={[
                      "w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                      plan.price === 0
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        : "bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow-md",
                    ].join(" ")}
                  >
                    {upgrading === plan.slug ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        Processando...
                      </>
                    ) : plan.price === 0 ? (
                      "Usar gratuito"
                    ) : (
                      <>
                        <Zap size={14} />
                        Assinar agora
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Billing management */}
      {user?.hasSubscription && isOwner && (
        <div className="text-center mt-10 space-y-3">
          <button
            onClick={openPortal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <CreditCard size={16} />
            Gerenciar assinatura e pagamento
          </button>
          <p className="text-xs text-gray-400">Alterar cartão, ver faturas, cancelar assinatura</p>
        </div>
      )}
    </div>
  );
}
