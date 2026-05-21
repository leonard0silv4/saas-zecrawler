import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, CreditCard } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { MODULE_LABELS } from "../lib/moduleLabels";

export default function SettingsPlanSection() {
  const { user, manageBilling, isOwner } = useAuth();
  const [subStatus, setSubStatus] = useState(null);

  useEffect(() => {
    api.get("/stripe/status").then((r) => setSubStatus(r.data)).catch(() => {});
  }, []);

  const effectivePlan = user?.effectivePlan || user?.plan || "free";
  const planConfig = user?.planConfig;
  const planModules = user?.planModules || [];
  const allowedModules = user?.allowedModules || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-brand-50 text-brand-700">
          <Crown size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Plano da conta</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Plano efetivo usado para limites e módulos (se você é membro de equipe, segue o plano do owner).
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-2">
        <p className="text-sm text-gray-600">
          Plano atual:{" "}
          <strong className="text-gray-900">{planConfig?.name || effectivePlan}</strong>
          <span className="text-gray-500"> ({effectivePlan})</span>
        </p>
        {planConfig?.maxLinks != null && (
          <p className="text-sm text-gray-600">
            Limite de links: <strong className="text-gray-900">{planConfig.maxLinks.toLocaleString("pt-BR")}</strong>
          </p>
        )}
        {planConfig?.maxSellerMonitors != null && (
          <p className="text-sm text-gray-600">
            Limite de sellers monitorados:{" "}
            <strong className="text-gray-900">{planConfig.maxSellerMonitors.toLocaleString("pt-BR")}</strong>
          </p>
        )}
        {subStatus?.subscription?.currentPeriodEnd && (
          <p className="text-sm text-gray-600">
            {subStatus.subscription.cancelAtPeriodEnd ? "Acesso até" : "Renova em"}{" "}
            <strong>{new Date(subStatus.subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}</strong>
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-800 mb-2">Módulos incluídos no plano</h3>
        <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
          {planModules.length === 0 ? (
            <li>Nenhum (verifique seu cadastro)</li>
          ) : (
            planModules.map((key) => (
              <li key={key}>{MODULE_LABELS[key] || key}</li>
            ))
          )}
        </ul>
      </div>

      {user?.role === "member" && (
        <div>
          <h3 className="text-sm font-medium text-gray-800 mb-2">Seu acesso (permissões)</h3>
          <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
            {allowedModules.length === 0 ? (
              <li>Nenhum módulo atribuído — peça ao administrador.</li>
            ) : (
              allowedModules.map((key) => <li key={key}>{MODULE_LABELS[key] || key}</li>)
            )}
          </ul>
        </div>
      )}

      {isOwner && (
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            to="/plans"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            Ver todos os planos
          </Link>
          {user?.hasSubscription && (
            <button
              type="button"
              onClick={() => manageBilling()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-50"
            >
              <CreditCard size={18} />
              Gerenciar assinatura
            </button>
          )}
        </div>
      )}
    </div>
  );
}
