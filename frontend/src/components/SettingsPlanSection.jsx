import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Crown, CreditCard } from "lucide-react";
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
    <div className="glass rounded-2xl p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg border border-warn/30 bg-warn/10 text-warn">
          <Crown size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-fg">Plano da conta</h2>
          <p className="text-sm text-fg-muted mt-0.5">
            Plano efetivo usado para limites e módulos (se você é membro de equipe, segue o plano do owner).
          </p>
        </div>
      </div>

      {(() => {
        const fmt = (n) => n.toLocaleString("pt-BR");
        const limits = [
          planConfig?.maxLinks != null && { label: "Links", value: fmt(planConfig.maxLinks) },
          planConfig?.maxSellerMonitors != null && { label: "Sellers monitorados", value: fmt(planConfig.maxSellerMonitors) },
          planConfig?.maxMeliAccounts > 0 && { label: "Contas Mercado Livre", value: fmt(planConfig.maxMeliAccounts) },
          planConfig?.maxMeliAccounts > 0 && {
            label: "Mensagens ML por mês",
            value: planConfig.maxMonthlyMessages == null ? "Ilimitado" : fmt(planConfig.maxMonthlyMessages),
          },
        ].filter(Boolean);
        const sub = subStatus?.subscription;
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-brandSolid-400/40 bg-brandSolid-500/15 px-3 py-1 text-sm font-medium text-fg">
                <Crown size={14} className="text-warn" />
                {planConfig?.name || effectivePlan}
              </span>
              {sub?.status !== "trialing" && sub?.currentPeriodEnd && (
                <span className="text-sm text-fg-muted">
                  {sub.cancelAtPeriodEnd ? "Acesso até" : "Renova em"}{" "}
                  <strong className="num text-fg">{new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}</strong>
                </span>
              )}
            </div>
            {sub?.status === "trialing" && sub.currentPeriodEnd && (
              <p className="text-sm text-fg/90 bg-brandSolid-500/10 ring-1 ring-inset ring-brandSolid-400/25 rounded-lg px-3 py-2">
                Em período de teste — encerra em{" "}
                <strong className="num">{new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}</strong>.
                Após isso, a cobrança começa automaticamente.
              </p>
            )}
            {limits.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {limits.map((l) => (
                  <div key={l.label} className="rounded-xl border border-line/10 bg-ink/[0.03] px-4 py-3">
                    <p className="text-xs text-fg-dim">{l.label}</p>
                    <p className="mt-1 num text-xl font-semibold text-fg">{l.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <div>
        <h3 className="text-sm font-medium text-fg mb-2">Módulos incluídos no plano</h3>
        {planModules.length === 0 ? (
          <p className="text-sm text-fg-muted">Nenhum (verifique seu cadastro)</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {planModules.map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5 rounded-full bg-neon/[0.07] px-3 py-1 text-xs text-fg/90 ring-1 ring-inset ring-neon/25">
                <Check size={12} className="text-neon" />
                {MODULE_LABELS[key] || key}
              </span>
            ))}
          </div>
        )}
      </div>

      {user?.role === "member" && (
        <div>
          <h3 className="text-sm font-medium text-fg mb-2">Seu acesso (permissões)</h3>
          <ul className="text-sm text-fg-muted space-y-1.5 list-disc list-inside">
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brandSolid-500 text-white text-sm font-medium hover:bg-brandSolid-400 shadow-glow-brand"
          >
            Ver todos os planos
          </Link>
          {user?.hasSubscription && (
            <button
              type="button"
              onClick={() => manageBilling()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-line/15 text-fg text-sm font-medium hover:bg-ink/[0.03]"
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
