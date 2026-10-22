import { useState, useEffect, useCallback } from "react";
import axios from "axios";

// ─── API client separado do app principal ────────────────────────
// Usa /panel em vez de /api — sem qualquer conflito com o router principal
const envUrl = import.meta.env.VITE_API_URL;
const BASE = envUrl ? `${String(envUrl).replace(/\/$/, "")}/api/panel` : "/api/panel";
const adminApi = axios.create({ baseURL: BASE });
adminApi.interceptors.request.use((c) => {
  const t = localStorage.getItem("admin_token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

// ─── Helpers ─────────────────────────────────────────────────────
const PLAN_COLORS = {
  free:     "bg-ink/[0.06] text-fg-muted",
  starter:  "bg-brandSolid-500/15 text-brandSolid-300",
  pro:      "bg-violet-500/15 text-violet-300",
  business: "bg-warn/15 text-warn",
};

const STATUS_COLORS = {
  free:     "text-fg-dim",
  active:   "text-neon",
  trialing: "text-brandSolid-300",
  past_due: "text-warn",
  canceled: "text-danger",
  manual:   "text-neon",
  expired:  "text-danger",
};

const STATUS_LABELS = {
  free:     "Gratuito",
  active:   "Ativo",
  trialing: "Trial",
  past_due: "Vencido",
  canceled: "Cancelado",
  manual:   "Manual",
  expired:  "Expirado",
};

function fmt(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtRelative(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "Agora";
  if (mins < 60)  return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d atrás`;
  return fmt(dateStr);
}

function Bar({ value, max, color = "bg-brandSolid-500" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const warn = pct >= 90;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-ink/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${warn ? "bg-red-400" : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-fg-muted tabular-nums">{value}/{max}</span>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="glass rounded-xl border border-line/10 p-5">
      <p className="text-xs font-medium text-fg-dim tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent || "text-fg"}`}>{value}</p>
      {sub && <p className="text-xs text-fg-dim mt-1">{sub}</p>}
    </div>
  );
}

// ─── Login ───────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr]   = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { data } = await adminApi.post("/login", { username: user, password: pass });
      localStorage.setItem("admin_token", data.token);
      onLogin();
    } catch (ex) {
      setErr(ex.response?.data?.error || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-2 border border-line/15 mb-4">
            <svg className="w-7 h-7 text-warn" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-fg">Admin Panel</h1>
          <p className="text-fg-muted text-sm mt-1">Acesso restrito</p>
        </div>

        <form onSubmit={submit} className="bg-surface/80 rounded-2xl border border-line/10 p-6 space-y-4">
          {err && (
            <div className="text-sm text-danger bg-red-900/20 border border-red-900/40 rounded-lg px-4 py-2.5">
              {err}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-fg-dim mb-1.5">Usuário</label>
            <input
              autoFocus value={user} onChange={(e) => setUser(e.target.value)} required
              className="field w-full"
              placeholder="usuário"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-dim mb-1.5">Senha</label>
            <input
              type="password" value={pass} onChange={(e) => setPass(e.target.value)} required
              className="field w-full"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 bg-warn hover:bg-amber-300 disabled:opacity-50 text-void font-semibold rounded-lg text-sm transition-colors shadow-[0_0_20px_-6px_rgb(var(--warn)/0.8)]"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="text-center mt-4">
          <a
            href="/login"
            className="text-xs text-fg-muted hover:text-fg-dim/60 transition-colors inline-flex items-center gap-1"
          >
            ← Ir para o login do app
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────
function Dashboard({ onLogout }) {
  const [stats, setStats]       = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sort, setSort]         = useState({ col: "createdAt", dir: "desc" });
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [impersonatingId, setImpersonatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        adminApi.get("/stats"),
        adminApi.get("/customers"),
      ]);
      setStats(s.data);
      setCustomers(c.data.customers);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("admin_token");
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(col) {
    setSort((s) => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
  }

  async function impersonate(customerId) {
    setImpersonatingId(customerId);
    try {
      const { data } = await adminApi.post(`/impersonate/${customerId}`);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.open("/", "_blank");
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao impersonar usuário");
    } finally {
      setImpersonatingId(null);
    }
  }

  function toggleExpand(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Filtering + sorting
  const visible = customers
    .filter((c) => {
      const q = search.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
      if (filterPlan !== "all" && c.plan !== filterPlan) return false;
      if (filterStatus === "subscribers" && c.plan === "free") return false;
      if (filterStatus === "free" && c.plan !== "free") return false;
      if (filterStatus === "active" && !c.isActive) return false;
      if (filterStatus === "inactive" && c.isActive) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.col === "name")         return dir * a.name.localeCompare(b.name);
      if (sort.col === "plan")         return dir * a.plan.localeCompare(b.plan);
      if (sort.col === "links")        return dir * (a.links.count - b.links.count);
      if (sort.col === "sellers")      return dir * (a.sellers.count - b.sellers.count);
      if (sort.col === "users")        return dir * (a.users.count - b.users.count);
      if (sort.col === "lastAccessAt") return dir * (new Date(a.lastAccessAt || 0) - new Date(b.lastAccessAt || 0));
      if (sort.col === "createdAt")    return dir * (new Date(a.createdAt) - new Date(b.createdAt));
      if (sort.col === "nextPayment")  return dir * (new Date(a.planExpiresAt || 0) - new Date(b.planExpiresAt || 0));
      if (sort.col === "autoReplies")  return dir * ((a.autoReplies || 0) - (b.autoReplies || 0));
      return 0;
    });

  function Th({ col, label, right }) {
    const active = sort.col === col;
    return (
      <th
        onClick={() => toggleSort(col)}
        className={`px-4 py-3 text-xs font-medium text-fg-dim  tracking-wide cursor-pointer select-none hover:text-fg-dim/40 whitespace-nowrap ${right ? "text-right" : "text-left"}`}
      >
        {label} {active ? (sort.dir === "asc" ? "↑" : "↓") : <span className="opacity-30">↕</span>}
      </th>
    );
  }

  return (
    <div className="min-h-screen bg-void text-fg">
      {/* Header */}
      <div className="border-b border-line/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-warn/15 border border-warn/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-warn" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-base leading-none">Admin Panel</h1>
            <p className="text-xs text-fg-muted mt-0.5">ML SmartHub</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="text-xs text-fg-dim hover:text-fg px-3 py-1.5 rounded-lg border border-line/15 hover:border-line/30 transition-colors"
          >
            ← App
          </a>
          <button onClick={load} className="text-xs text-fg-dim hover:text-fg px-3 py-1.5 rounded-lg border border-line/15 hover:border-line/30 transition-colors">
            ↻ Atualizar
          </button>
          <button onClick={() => { localStorage.removeItem("admin_token"); onLogout(); }}
            className="text-xs text-danger hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-900/50 hover:border-red-700 transition-colors">
            Sair
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatCard label="Total owners"     value={stats.total}         />
            <StatCard label="Assinantes"        value={stats.subscribers}   accent="text-emerald-400" />
            <StatCard label="Gratuitos"         value={stats.freeUsers}     />
            <StatCard label="Novos este mês"    value={stats.newThisMonth}  accent="text-sky-400" />
            <StatCard label="MRR estimado"      value={`R$ ${Number(stats.mrr).toLocaleString("pt-BR",{minimumFractionDigits:2})}`} accent="text-warn" />
            <StatCard label="Links totais"      value={stats.totalLinks}    />
            <StatCard label="Sellers monit."    value={stats.totalSellers}  />
          </div>
        )}

        {/* Breakdown planos */}
        {stats?.byPlan && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byPlan).map(([plan, count]) => (
              <span key={plan} className={`px-3 py-1 rounded-full text-xs font-medium ${PLAN_COLORS[plan] || "bg-ink/10 text-fg-dim/60"}`}>
                {plan}: {count}
              </span>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search" placeholder="Buscar nome ou e-mail…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field w-64"
          />
          <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}
            className="field">
            <option value="all">Todos planos</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="field">
            <option value="all">Todos status</option>
            <option value="subscribers">Assinantes</option>
            <option value="free">Gratuitos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <span className="text-xs text-fg-muted ml-auto">{visible.length} resultados</span>
        </div>

        {/* Table */}
        <div className="bg-surface/80 border border-line/10 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-fg-muted">
              <div className="w-6 h-6 border-2 border-line/15 border-t-amber-400 rounded-full animate-spin mr-3" />
              Carregando…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="border-b border-line/10">
                  <tr>
                    <th className="w-8" />
                    <Th col="name"         label="Cliente" />
                    <Th col="plan"         label="Plano" />
                    <th className="px-4 py-3 text-xs font-medium text-fg-dim tracking-wide text-left">Status</th>
                    <Th col="links"        label="Links" />
                    <Th col="sellers"      label="Sellers" />
                    <Th col="users"        label="Usuários" />
                    <th className="px-4 py-3 text-xs font-medium text-fg-dim tracking-wide text-left">Times</th>
                    <Th col="createdAt"    label="Criado" />
                    <Th col="lastAccessAt" label="Último acesso" />
                    <Th col="nextPayment"  label="Próx. pag." />
                    <Th col="autoReplies" label="Respostas auto." right />
                    <th className="px-4 py-3 text-xs font-medium text-fg-dim tracking-wide text-left">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/[0.07]">
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={13} className="text-center py-12 text-fg-muted">Nenhum resultado</td>
                    </tr>
                  )}
                  {visible.flatMap((c) => {
                    const isExpanded = expandedIds.has(c.id);
                    const hasMembers = c.members?.length > 0;
                    const rows = [
                      <tr key={c.id} className="hover:bg-ink/[0.04] transition-colors">
                        {/* Expand toggle */}
                        <td className="pl-3 py-3 w-8">
                          {hasMembers ? (
                            <button
                              onClick={() => toggleExpand(c.id)}
                              className="text-fg-muted hover:text-warn text-xs transition-colors leading-none"
                              title={isExpanded ? "Recolher usuários" : `Ver ${c.members.length} usuário(s)`}
                            >
                              {isExpanded ? "▼" : "▶"}
                            </button>
                          ) : null}
                        </td>

                        {/* Cliente */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-fg">{c.name}</p>
                          <p className="text-xs text-fg-dim">{c.email}</p>
                        </td>

                        {/* Plano */}
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${PLAN_COLORS[c.plan] || "bg-ink/10 text-fg-dim/60"}`}>
                            {c.planName}
                          </span>
                          {c.planPrice > 0 && (
                            <p className="text-xs text-fg-muted mt-0.5">R$ {c.planPrice.toFixed(2)}/mês</p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${STATUS_COLORS[c.subscriptionStatus] || "text-fg-dim"}`}>
                            ● {STATUS_LABELS[c.subscriptionStatus] || c.subscriptionStatus}
                          </span>
                          {c.hasStripe && (
                            <p className="text-xs text-fg-muted mt-0.5">Stripe</p>
                          )}
                        </td>

                        {/* Links */}
                        <td className="px-4 py-3">
                          <Bar value={c.links.count} max={c.links.max} color="bg-brandSolid-500" />
                        </td>

                        {/* Sellers */}
                        <td className="px-4 py-3">
                          <Bar value={c.sellers.count} max={c.sellers.max} color="bg-teal-500" />
                        </td>

                        {/* Usuários */}
                        <td className="px-4 py-3">
                          <Bar value={c.users.count} max={c.users.max} color="bg-violet-500" />
                        </td>

                        {/* Times */}
                        <td className="px-4 py-3">
                          <Bar value={c.teams.count} max={c.teams.max} color="bg-orange-400" />
                        </td>

                        {/* Criado */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-fg-dim">{fmt(c.createdAt)}</span>
                        </td>

                        {/* Último acesso */}
                        <td className="px-4 py-3">
                          <span className={`text-xs ${c.lastAccessAt ? "text-fg-dim/60" : "text-fg-muted"}`}>
                            {fmtRelative(c.lastAccessAt)}
                          </span>
                        </td>

                        {/* Próximo pagamento */}
                        <td className="px-4 py-3">
                          {c.planExpiresAt ? (
                            <span className={`text-xs ${new Date(c.planExpiresAt) < new Date() ? "text-danger" : "text-fg-dim/60"}`}>
                              {fmt(c.planExpiresAt)}
                            </span>
                          ) : (
                            <span className="text-xs text-fg-muted">—</span>
                          )}
                        </td>

                        {/* Respostas automáticas */}
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold tabular-nums ${c.autoReplies > 0 ? "text-emerald-400" : "text-fg-muted"}`}>
                            {(c.autoReplies || 0).toLocaleString("pt-BR")}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => impersonate(c.id)}
                            disabled={impersonatingId === c.id}
                            className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-warn border border-amber-500/30 hover:bg-amber-500/20 disabled:opacity-40 transition-colors whitespace-nowrap"
                          >
                            {impersonatingId === c.id ? "…" : "Entrar como"}
                          </button>
                        </td>
                      </tr>,
                    ];

                    if (isExpanded && hasMembers) {
                      rows.push(
                        <tr key={`${c.id}-members`} className="bg-ink/[0.02]">
                          <td colSpan={13} className="px-0 py-0">
                            <div className="ml-10 mr-4 my-2 border-l-2 border-line/15 pl-4">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr>
                                    <th className="text-left py-1 pr-6 font-medium text-fg-muted tracking-wide">Usuário</th>
                                    <th className="text-left py-1 pr-6 font-medium text-fg-muted tracking-wide">Role</th>
                                    <th className="text-left py-1 font-medium text-fg-muted tracking-wide">Último acesso</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.members.map((m) => (
                                    <tr key={m.id} className="border-t border-line/10">
                                      <td className="py-1.5 pr-6">
                                        <p className="text-fg-dim/60">{m.name}</p>
                                        <p className="text-fg-muted">{m.email}</p>
                                      </td>
                                      <td className="py-1.5 pr-6">
                                        <span className="text-fg-dim capitalize">{m.role}</span>
                                      </td>
                                      <td className="py-1.5">
                                        <span className={m.lastAccessAt ? "text-fg-dim/60" : "text-fg-muted"}>
                                          {fmtRelative(m.lastAccessAt)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Entry point ────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("admin_token"));

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => setAuthed(false)} />;
}
