import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { Check, Zap, CreditCard, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import api from "../services/api";

export default function PlansPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState({});
  const [subStatus, setSubStatus] = useState(null);
  const [upgrading, setUpgrading] = useState(null);
  const [toast, setToast] = useState(null);

  // Load plans + subscription status
  useEffect(() => {
    api.get("/plans").then((r) => setPlans(r.data));
    api.get("/stripe/status").then((r) => setSubStatus(r.data)).catch(() => {});
  }, []);

  // Handle Stripe redirect callbacks
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setToast({ type: "success", message: "Pagamento realizado! Seu plano foi atualizado." });
      // Refresh user data after Stripe webhook processes
      setTimeout(() => window.location.reload(), 2000);
    } else if (status === "canceled") {
      setToast({ type: "info", message: "Pagamento cancelado. Seu plano não foi alterado." });
    }
    if (status) {
      searchParams.delete("status");
      searchParams.delete("session_id");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  async function handleUpgrade(slug) {
    if (slug === "free") {
      // Downgrade to free
      setUpgrading(slug);
      try {
        if (user?.hasSubscription) {
          await api.post("/stripe/downgrade");
          setToast({ type: "info", message: "Assinatura será cancelada ao fim do período atual." });
        } else {
          await api.put("/auth/plan", { plan: "free" });
          window.location.reload();
        }
      } catch (err) {
        setToast({ type: "error", message: err.response?.data?.error || "Erro ao alterar plano" });
      } finally {
        setUpgrading(null);
      }
      return;
    }

    // Paid plan → Stripe Checkout
    setUpgrading(slug);
    try {
      const { data } = await api.post("/stripe/checkout", { planSlug: slug });
      if (data.url) {
        window.location.href = data.url;
        return; // Don't reset upgrading — page is navigating away
      }
      if (data.updated) {
        setToast({ type: "success", message: "Plano atualizado!" });
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.error || "Erro ao iniciar pagamento" });
    } finally {
      setUpgrading(null);
    }
  }

  async function openPortal() {
    try {
      const { data } = await api.post("/stripe/portal");
      window.location.href = data.url;
    } catch (err) {
      setToast({ type: "error", message: "Erro ao abrir portal de cobrança" });
    }
  }

  const planList = Object.values(plans);
  const accents = ["border-gray-200", "border-blue-300", "border-purple-400", "border-amber-400"];
  const badges = [null, null, "Popular", "Completo"];

  const cancelPending = subStatus?.subscription?.cancelAtPeriodEnd;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
          toast.type === "success" ? "bg-emerald-50 text-emerald-700" :
          toast.type === "error" ? "bg-red-50 text-red-700" :
          "bg-blue-50 text-blue-700"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> :
           toast.type === "error" ? <XCircle size={18} /> :
           <AlertCircle size={18} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Planos e Preços</h1>
        <p className="text-gray-500 mt-1">Escolha o plano ideal para o seu negócio</p>
      </div>

      {/* Cancel pending banner */}
      {cancelPending && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 text-amber-700 text-sm max-w-3xl mx-auto">
          <AlertCircle size={18} className="shrink-0" />
          <span>
            Sua assinatura será cancelada em{" "}
            <strong>{new Date(subStatus.subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}</strong>.
            Você pode reativar no portal de cobrança.
          </span>
        </div>
      )}

      {/* Subscription status card */}
      {subStatus?.subscription && (
        <div className="mb-8 max-w-md mx-auto bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900">Assinatura ativa</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              subStatus.subscription.status === "active" ? "bg-emerald-50 text-emerald-600" :
              subStatus.subscription.status === "past_due" ? "bg-red-50 text-red-600" :
              "bg-gray-100 text-gray-500"
            }`}>
              {subStatus.subscription.status === "active" ? "Ativa" :
               subStatus.subscription.status === "past_due" ? "Pagamento pendente" :
               subStatus.subscription.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Plano <strong>{subStatus.planConfig?.name}</strong> — renova em{" "}
            {new Date(subStatus.subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
          </p>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
        {planList.map((plan, i) => {
          const isCurrent = (user?.effectivePlan || user?.plan) === plan.slug;
          return (
            <div key={plan.slug}
              className={`relative bg-white rounded-2xl border-2 ${
                isCurrent ? "border-brand-500 shadow-lg shadow-brand-100" : accents[i]
              } p-6 flex flex-col`}>

              {badges[i] && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  {badges[i]}
                </span>
              )}

              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-3 mb-4">
                {plan.price === 0 ? (
                  <span className="text-3xl font-bold text-gray-900">Grátis</span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-gray-500">R$</span>
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-sm text-gray-500">/mês</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Até <strong>{plan.maxLinks.toLocaleString()}</strong> links
              </p>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features?.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="text-center text-sm font-medium text-brand-600 bg-brand-50 py-2.5 rounded-lg">
                  Plano atual
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.slug)}
                  disabled={!!upgrading}
                  className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                    plan.price === 0
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-brand-600 text-white hover:bg-brand-700"
                  }`}
                >
                  {upgrading === plan.slug ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processando...
                    </span>
                  ) : (
                    <>
                      {plan.price > 0 && <Zap size={14} />}
                      {plan.price === 0 ? "Usar gratuito" : isCurrent ? "Plano atual" : "Assinar"}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Billing management */}
      {user?.hasSubscription && (
        <div className="text-center mt-10 space-y-3">
          <button onClick={openPortal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <CreditCard size={16} />
            Gerenciar assinatura e pagamento
          </button>
          <p className="text-xs text-gray-400">
            Alterar cartão, ver faturas, cancelar assinatura
          </p>
        </div>
      )}
    </div>
  );
}
