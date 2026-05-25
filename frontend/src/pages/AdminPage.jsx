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
  free:     "bg-gray-100 text-gray-600",
  starter:  "bg-blue-100 text-blue-700",
  pro:      "bg-violet-100 text-violet-700",
  business: "bg-amber-100 text-amber-700",
};

const STATUS_COLORS = {
  free:     "text-gray-400",
  active:   "text-emerald-500",
  trialing: "text-sky-500",
  past_due: "text-orange-500",
  canceled: "text-red-400",
  manual:   "text-teal-500",
  expired:  "text-red-400",
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

function Bar({ value, max, color = "bg-blue-500" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const warn = pct >= 90;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${warn ? "bg-red-400" : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">{value}/{max}</span>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent || "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 mb-4">
            <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Acesso restrito</p>
        </div>

        <form onSubmit={submit} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
          {err && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-4 py-2.5">
              {err}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Usuário</label>
            <input
              autoFocus value={user} onChange={(e) => setUser(e.target.value)} required
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="usuário"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Senha</label>
            <input
              type="password" value={pass} onChange={(e) => setPass(e.target.value)} required
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold rounded-lg text-sm transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
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

  // Sorting
  function toggleSort(col) {
    setSort((s) => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
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
      return 0;
    });

  function Th({ col, label, right }) {
    const active = sort.col === col;
    return (
      <th
        onClick={() => toggleSort(col)}
        className={`px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-200 whitespace-nowrap ${right ? "text-right" : "text-left"}`}
      >
        {label} {active ? (sort.dir === "asc" ? "↑" : "↓") : <span className="opacity-30">↕</span>}
      </th>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-base leading-none">Admin Panel</h1>
            <p className="text-xs text-gray-500 mt-0.5">ML SmartHub</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
            ↻ Atualizar
          </button>
          <button onClick={() => { localStorage.removeItem("admin_token"); onLogout(); }}
            className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-900/50 hover:border-red-700 transition-colors">
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatCard label="Total owners"     value={stats.total}         />
            <StatCard label="Assinantes"        value={stats.subscribers}   accent="text-emerald-400" />
            <StatCard label="Gratuitos"         value={stats.freeUsers}     />
            <StatCard label="Novos este mês"    value={stats.newThisMonth}  accent="text-sky-400" />
            <StatCard label="MRR estimado"      value={`R$ ${Number(stats.mrr).toLocaleString("pt-BR",{minimumFractionDigits:2})}`} accent="text-amber-400" />
            <StatCard label="Links totais"      value={stats.totalLinks}    />
            <StatCard label="Sellers monit."    value={stats.totalSellers}  />
          </div>
        )}

        {/* Breakdown planos */}
        {stats?.byPlan && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byPlan).map(([plan, count]) => (
              <span key={plan} className={`px-3 py-1 rounded-full text-xs font-medium ${PLAN_COLORS[plan] || "bg-gray-700 text-gray-300"}`}>
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
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 w-64"
          />
          <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500">
            <option value="all">Todos planos</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500">
            <option value="all">Todos status</option>
            <option value="subscribers">Assinantes</option>
            <option value="free">Gratuitos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <span className="text-xs text-gray-500 ml-auto">{visible.length} resultados</span>
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <div className="w-6 h-6 border-2 border-gray-700 border-t-amber-400 rounded-full animate-spin mr-3" />
              Carregando…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr>
                    <Th col="name"         label="Cliente" />
                    <Th col="plan"         label="Plano" />
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide text-left">Status</th>
                    <Th col="links"        label="Links" right />
                    <Th col="sellers"      label="Sellers" right />
                    <Th col="users"        label="Usuários" right />
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide text-right">Times</th>
                    <Th col="createdAt"    label="Criado" />
                    <Th col="lastAccessAt" label="Último acesso" />
                    <Th col="nextPayment"  label="Próx. pag." />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-gray-500">Nenhum resultado</td>
                    </tr>
                  )}
                  {visible.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-800/40 transition-colors">
                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </td>

                      {/* Plano */}
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${PLAN_COLORS[c.plan] || "bg-gray-700 text-gray-300"}`}>
                          {c.planName}
                        </span>
                        {c.planPrice > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">R$ {c.planPrice.toFixed(2)}/mês</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${STATUS_COLORS[c.subscriptionStatus] || "text-gray-400"}`}>
                          ● {STATUS_LABELS[c.subscriptionStatus] || c.subscriptionStatus}
                        </span>
                        {c.hasStripe && (
                          <p className="text-xs text-gray-600 mt-0.5">Stripe</p>
                        )}
                      </td>

                      {/* Links */}
                      <td className="px-4 py-3 text-right">
                        <Bar value={c.links.count} max={c.links.max} color="bg-blue-500" />
                      </td>

                      {/* Sellers */}
                      <td className="px-4 py-3 text-right">
                        <Bar value={c.sellers.count} max={c.sellers.max} color="bg-teal-500" />
                      </td>

                      {/* Usuários */}
                      <td className="px-4 py-3 text-right">
                        <Bar value={c.users.count} max={c.users.max} color="bg-violet-500" />
                      </td>

                      {/* Times */}
                      <td className="px-4 py-3 text-right">
                        <Bar value={c.teams.count} max={c.teams.max} color="bg-orange-400" />
                      </td>

                      {/* Criado */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400">{fmt(c.createdAt)}</span>
                      </td>

                      {/* Último acesso */}
                      <td className="px-4 py-3">
                        <span className={`text-xs ${c.lastAccessAt ? "text-gray-300" : "text-gray-600"}`}>
                          {fmtRelative(c.lastAccessAt)}
                        </span>
                      </td>

                      {/* Próximo pagamento */}
                      <td className="px-4 py-3">
                        {c.planExpiresAt ? (
                          <span className={`text-xs ${new Date(c.planExpiresAt) < new Date() ? "text-red-400" : "text-gray-300"}`}>
                            {fmt(c.planExpiresAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
