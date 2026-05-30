import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Shield,
  Eye,
  EyeOff,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { notifyError, notifyWarning } from "../utils/notify.js";

// Módulos disponíveis com label amigável
const MODULE_LABELS = {
  links: "Links",
  priceAnalyze: "Análise de Preços",
  catalog: "Catálogo",
  meli: "Contas Mercado Livre",
  meliMessages: "Mensagens ML",
  meliAnalytics: "Analytics ML",
  sellerMonitor: "Monitor Sellers",
};

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ─── Checkbox de módulo ────────────────────────────────────────────────────────
function ModuleCheckbox({ module, checked, onChange, disabled }) {
  return (
    <label className={cn("flex items-center gap-2 cursor-pointer", disabled && "opacity-40 cursor-not-allowed")}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(module, e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm text-gray-700">{MODULE_LABELS[module] || module}</span>
    </label>
  );
}

// ─── Pill de permissão ─────────────────────────────────────────────────────────
function PermBadge({ module }) {
  return (
    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">
      {MODULE_LABELS[module] || module}
    </span>
  );
}

// ─── Modal genérico ────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// ─── Formulário de usuário ─────────────────────────────────────────────────────
function UserForm({ initial, planModules, teams, onSave, onCancel, isEdit }) {
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [permissions, setPermissions] = useState(initial?.permissions || []);
  const [teamIds, setTeamIds] = useState((initial?.teamIds || []).map((t) => String(t._id || t)));
  const [saving, setSaving] = useState(false);

  function togglePerm(module, checked) {
    setPermissions((prev) => checked ? [...prev, module] : prev.filter((p) => p !== module));
  }

  function toggleTeam(teamId, checked) {
    setTeamIds((prev) => checked ? [...prev, teamId] : prev.filter((id) => id !== teamId));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return notifyWarning("Informe o nome do usuário");
    if (!isEdit && !email.trim()) return notifyWarning("Informe o email");
    if (!isEdit && !password) return notifyWarning("Informe a senha");
    setSaving(true);
    try {
      await onSave({ name: name.trim(), email: email.trim(), password, permissions, teamIds });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Nome *</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do usuário"
          required
        />
      </div>
      {!isEdit && (
        <>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Email *</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Senha inicial *</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-700"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </>
      )}

      <div>
        <p className="text-xs text-gray-500 mb-2 font-medium">Permissões diretas</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(MODULE_LABELS).map((mod) => (
            <ModuleCheckbox
              key={mod}
              module={mod}
              checked={permissions.includes(mod)}
              onChange={togglePerm}
              disabled={!planModules.includes(mod)}
            />
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Módulos desabilitados não estão disponíveis no plano atual.</p>
      </div>

      {teams.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Times</p>
          <div className="space-y-1.5">
            {teams.map((t) => (
              <label key={t._id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={teamIds.includes(String(t._id))}
                  onChange={(e) => toggleTeam(String(t._id), e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600"
                />
                <span className="text-sm text-gray-700">{t.name}</span>
                <span className="text-[10px] text-gray-400">
                  ({(t.permissions || []).map((p) => MODULE_LABELS[p] || p).join(", ") || "sem permissões"})
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50">
          <Check size={14} />
          {saving ? "Salvando..." : isEdit ? "Salvar" : "Criar usuário"}
        </button>
      </div>
    </form>
  );
}

// ─── Formulário de time ────────────────────────────────────────────────────────
function TeamForm({ initial, planModules, onSave, onCancel, isEdit }) {
  const [name, setName] = useState(initial?.name || "");
  const [permissions, setPermissions] = useState(initial?.permissions || []);
  const [saving, setSaving] = useState(false);

  function togglePerm(module, checked) {
    setPermissions((prev) => checked ? [...prev, module] : prev.filter((p) => p !== module));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return notifyWarning("Informe o nome do time");
    setSaving(true);
    try {
      await onSave({ name: name.trim(), permissions });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Nome do time *</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Comercial, Suporte…"
          required
        />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2 font-medium">Permissões do time</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(MODULE_LABELS).map((mod) => (
            <ModuleCheckbox
              key={mod}
              module={mod}
              checked={permissions.includes(mod)}
              onChange={togglePerm}
              disabled={!planModules.includes(mod)}
            />
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Módulos desabilitados não estão disponíveis no plano atual.</p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50">
          <Check size={14} />
          {saving ? "Salvando..." : isEdit ? "Salvar" : "Criar time"}
        </button>
      </div>
    </form>
  );
}

// ─── Modal: alterar senha ──────────────────────────────────────────────────────
function ChangePasswordModal({ open, user, onClose }) {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!password || password.length < 6) return notifyWarning("Senha deve ter pelo menos 6 caracteres");
    setSaving(true);
    try {
      await api.put(`/team/users/${user._id}/password`, { password });
      setPassword("");
      onClose();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao alterar senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Alterar senha — ${user?.name}`}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Nova senha</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-700"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50">
            {saving ? "Salvando..." : "Alterar senha"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Painel de membros do time (expandível) ────────────────────────────────────
function TeamMembersPanel({ team, allUsers, onAddMember, onRemoveMember }) {
  const [open, setOpen] = useState(false);
  const members = allUsers.filter((u) => (u.teamIds || []).some((t) => String(t._id || t) === String(team._id)));
  const nonMembers = allUsers.filter((u) => !(u.teamIds || []).some((t) => String(t._id || t) === String(team._id)));

  return (
    <div className="mt-2 border border-gray-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-xs text-gray-600 font-medium hover:bg-gray-100"
      >
        <span>Membros ({members.length})</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="p-3 space-y-2">
          {members.length === 0 && (
            <p className="text-xs text-gray-400">Nenhum membro neste time.</p>
          )}
          {members.map((u) => (
            <div key={u._id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{u.name}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveMember(team._id, u._id)}
                className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                title="Remover do time"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {nonMembers.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Adicionar usuário:</p>
              {nonMembers.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => onAddMember(team._id, u._id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-brand-50 text-left"
                >
                  <UserPlus size={13} className="text-brand-600 shrink-0" />
                  <span className="text-sm text-gray-700">{u.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page principal ────────────────────────────────────────────────────────────
export default function TeamPage() {
  const { user } = useAuth();
  const planModules = user?.planModules || [];
  const planConfig = user?.planConfig || {};

  const [tab, setTab] = useState("users"); // "users" | "teams"
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // modais de usuário
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [changePassUser, setChangePassUser] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // modais de time
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [deleteTeamId, setDeleteTeamId] = useState(null);
  const [deletingTeam, setDeletingTeam] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [uRes, tRes] = await Promise.all([
        api.get("/team/users"),
        api.get("/team/teams"),
      ]);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      setTeams(Array.isArray(tRes.data) ? tRes.data : []);
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao carregar time");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Usuários ──
  async function handleCreateUser(payload) {
    try {
      await api.post("/team/users", payload);
      setShowCreateUser(false);
      await loadAll();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao criar usuário");
    }
  }

  async function handleUpdateUser(payload) {
    try {
      await api.put(`/team/users/${editUser._id}`, payload);
      setEditUser(null);
      await loadAll();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao atualizar usuário");
    }
  }

  async function confirmDeleteUser() {
    if (!deleteUserId) return;
    setDeletingUser(true);
    try {
      await api.delete(`/team/users/${deleteUserId}`);
      setDeleteUserId(null);
      await loadAll();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao excluir usuário");
    } finally {
      setDeletingUser(false);
    }
  }

  // ── Times ──
  async function handleCreateTeam(payload) {
    try {
      await api.post("/team/teams", payload);
      setShowCreateTeam(false);
      await loadAll();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao criar time");
    }
  }

  async function handleUpdateTeam(payload) {
    try {
      await api.put(`/team/teams/${editTeam._id}`, payload);
      setEditTeam(null);
      await loadAll();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao atualizar time");
    }
  }

  async function confirmDeleteTeam() {
    if (!deleteTeamId) return;
    setDeletingTeam(true);
    try {
      await api.delete(`/team/teams/${deleteTeamId}`);
      setDeleteTeamId(null);
      await loadAll();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao excluir time");
    } finally {
      setDeletingTeam(false);
    }
  }

  async function handleAddMember(teamId, userId) {
    try {
      await api.post(`/team/teams/${teamId}/members`, { userId });
      await loadAll();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao adicionar membro");
    }
  }

  async function handleRemoveMember(teamId, userId) {
    try {
      await api.delete(`/team/teams/${teamId}/members/${userId}`);
      await loadAll();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao remover membro");
    }
  }

  const maxUsers = planConfig.maxTeamUsers ?? 0;
  const maxTeams = planConfig.maxTeams ?? 0;
  const deleteUserTarget = users.find((u) => u._id === deleteUserId);
  const deleteTeamTarget = teams.find((t) => t._id === deleteTeamId);

  return (
    <div className="space-y-6 mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={22} className="text-brand-600" />
            Time & Permissões
          </h1>
          <p className="text-gray-500 mt-1">Gerencie usuários e times com permissões específicas.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition",
            tab === "users" ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <span className="flex items-center gap-2">
            <Users size={15} /> Usuários
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {users.length}/{maxUsers}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("teams")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition",
            tab === "teams" ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <span className="flex items-center gap-2">
            <Shield size={15} /> Times
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {teams.length}/{maxTeams}
            </span>
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ─── ABA USUÁRIOS ───────────────────────────────────────────────── */}
          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {users.length} de {maxUsers} usuário{maxUsers !== 1 ? "s" : ""} utilizados
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateUser(true)}
                  disabled={users.length >= maxUsers}
                  className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus size={14} /> Novo usuário
                </button>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <Users size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">Nenhum usuário criado ainda.</p>
                  <p className="text-gray-400 text-xs mt-1">Crie um usuário e defina permissões específicas.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                  {users.map((u) => {
                    const userTeams = teams.filter((t) =>
                      (u.teamIds || []).some((tid) => String(tid._id || tid) === String(t._id))
                    );
                    return (
                      <div key={u._id} className="p-4 flex flex-wrap items-start gap-3 justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-bold shrink-0">
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                            </div>
                          </div>

                          {/* Permissões diretas */}
                          {u.permissions?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {u.permissions.map((p) => <PermBadge key={p} module={p} />)}
                            </div>
                          )}

                          {/* Times */}
                          {userTeams.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {userTeams.map((t) => (
                                <span key={t._id} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                                  🏷 {t.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {u.permissions?.length === 0 && userTeams.length === 0 && (
                            <p className="text-xs text-gray-400 mt-1">Sem permissões</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            title="Alterar senha"
                            onClick={() => setChangePassUser(u)}
                            className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            title="Editar usuário"
                            onClick={() => setEditUser(u)}
                            className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            title="Excluir usuário"
                            onClick={() => setDeleteUserId(u._id)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── ABA TIMES ──────────────────────────────────────────────────── */}
          {tab === "teams" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {teams.length} de {maxTeams} time{maxTeams !== 1 ? "s" : ""} utilizados
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(true)}
                  disabled={teams.length >= maxTeams}
                  className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus size={14} /> Novo time
                </button>
              </div>

              {teams.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <Shield size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">Nenhum time criado ainda.</p>
                  <p className="text-gray-400 text-xs mt-1">Crie um time para agrupar usuários com as mesmas permissões.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.map((t) => (
                    <div key={t._id} className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900">{t.name}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {(t.permissions || []).length === 0 ? (
                              <span className="text-xs text-gray-400">Sem permissões definidas</span>
                            ) : (
                              (t.permissions || []).map((p) => <PermBadge key={p} module={p} />)
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditTeam(t)}
                            className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                            title="Editar time"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTeamId(t._id)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Excluir time"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <TeamMembersPanel
                        team={t}
                        allUsers={users}
                        onAddMember={handleAddMember}
                        onRemoveMember={handleRemoveMember}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Modais de usuário ─────────────────────────────────────────────── */}
      <Modal open={showCreateUser} onClose={() => setShowCreateUser(false)} title="Criar usuário">
        <UserForm
          planModules={planModules}
          teams={teams}
          onSave={handleCreateUser}
          onCancel={() => setShowCreateUser(false)}
          isEdit={false}
        />
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Editar: ${editUser?.name}`}>
        {editUser && (
          <UserForm
            initial={editUser}
            planModules={planModules}
            teams={teams}
            onSave={handleUpdateUser}
            onCancel={() => setEditUser(null)}
            isEdit
          />
        )}
      </Modal>

      <ChangePasswordModal
        open={!!changePassUser}
        user={changePassUser}
        onClose={() => setChangePassUser(null)}
      />

      {/* Confirmar exclusão de usuário */}
      {deleteUserId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Excluir usuário?</h3>
            <p className="text-sm text-gray-600">
              O usuário <strong>{deleteUserTarget?.name}</strong> será removido permanentemente.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteUserId(null)} disabled={deletingUser} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700">Cancelar</button>
              <button onClick={confirmDeleteUser} disabled={deletingUser} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                <Trash2 size={14} /> {deletingUser ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Modais de time ───────────────────────────────────────────────── */}
      <Modal open={showCreateTeam} onClose={() => setShowCreateTeam(false)} title="Criar time">
        <TeamForm
          planModules={planModules}
          onSave={handleCreateTeam}
          onCancel={() => setShowCreateTeam(false)}
          isEdit={false}
        />
      </Modal>

      <Modal open={!!editTeam} onClose={() => setEditTeam(null)} title={`Editar time: ${editTeam?.name}`}>
        {editTeam && (
          <TeamForm
            initial={editTeam}
            planModules={planModules}
            onSave={handleUpdateTeam}
            onCancel={() => setEditTeam(null)}
            isEdit
          />
        )}
      </Modal>

      {/* Confirmar exclusão de time */}
      {deleteTeamId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Excluir time?</h3>
            <p className="text-sm text-gray-600">
              O time <strong>{deleteTeamTarget?.name}</strong> será removido e os usuários perderão as permissões herdadas dele.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTeamId(null)} disabled={deletingTeam} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700">Cancelar</button>
              <button onClick={confirmDeleteTeam} disabled={deletingTeam} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                <Trash2 size={14} /> {deletingTeam ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
