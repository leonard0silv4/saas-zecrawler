import { useCallback, useEffect, useState } from "react";
import { Users, Plus, Pencil, Trash2, Shield } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { notifyError } from "../utils/notify.js";
import { Modal } from "../components/ui/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { ModuleCheckbox as _MC, MODULE_LABELS } from "../components/team/ModuleCheckbox";
import { PermBadge } from "../components/team/PermBadge";
import { UserForm } from "../components/team/UserForm";
import { TeamForm } from "../components/team/TeamForm";
import { ChangePasswordModal } from "../components/team/ChangePasswordModal";
import { TeamMembersPanel } from "../components/team/TeamMembersPanel";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function TeamPage() {
  const { user } = useAuth();
  const planModules = user?.planModules || [];
  const planConfig = user?.planConfig || {};

  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [changePassUser, setChangePassUser] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={22} className="text-brand-600" />
            Time & Permissões
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Gerencie usuários e times com permissões específicas.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-100">
        {[
          { key: "users", icon: Users, label: "Usuários", count: `${users.length}/${maxUsers}` },
          { key: "teams", icon: Shield, label: "Times", count: `${teams.length}/${maxTeams}` },
        ].map(({ key, icon: Icon, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition",
              tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <span className="flex items-center gap-2">
              <Icon size={15} /> {label}
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {count}
              </span>
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ABA USUÁRIOS */}
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
                          {u.permissions?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {u.permissions.map((p) => <PermBadge key={p} module={p} />)}
                            </div>
                          )}
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
                          <button type="button" title="Alterar senha" onClick={() => setChangePassUser(u)} className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50">
                            <Shield size={15} />
                          </button>
                          <button type="button" title="Editar usuário" onClick={() => setEditUser(u)} className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50">
                            <Pencil size={15} />
                          </button>
                          <button type="button" title="Excluir usuário" onClick={() => setDeleteUserId(u._id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
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

          {/* ABA TIMES */}
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
                          <button type="button" onClick={() => setEditTeam(t)} className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50" title="Editar time">
                            <Pencil size={15} />
                          </button>
                          <button type="button" onClick={() => setDeleteTeamId(t._id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" title="Excluir time">
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

      {/* Modais de usuário */}
      <Modal isOpen={showCreateUser} onClose={() => setShowCreateUser(false)} title="Criar usuário">
        <UserForm
          planModules={planModules}
          teams={teams}
          onSave={handleCreateUser}
          onCancel={() => setShowCreateUser(false)}
          isEdit={false}
        />
      </Modal>

      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title={`Editar: ${editUser?.name}`}>
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

      <ConfirmDialog
        open={!!deleteUserId}
        title="Excluir usuário?"
        message={`O usuário ${deleteUserTarget?.name} será removido permanentemente.`}
        confirmLabel="Excluir"
        loading={deletingUser}
        onConfirm={confirmDeleteUser}
        onClose={() => setDeleteUserId(null)}
      />

      {/* Modais de time */}
      <Modal isOpen={showCreateTeam} onClose={() => setShowCreateTeam(false)} title="Criar time">
        <TeamForm
          planModules={planModules}
          onSave={handleCreateTeam}
          onCancel={() => setShowCreateTeam(false)}
          isEdit={false}
        />
      </Modal>

      <Modal isOpen={!!editTeam} onClose={() => setEditTeam(null)} title={`Editar time: ${editTeam?.name}`}>
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

      <ConfirmDialog
        open={!!deleteTeamId}
        title="Excluir time?"
        message={`O time ${deleteTeamTarget?.name} será removido e os usuários perderão as permissões herdadas dele.`}
        confirmLabel="Excluir"
        loading={deletingTeam}
        onConfirm={confirmDeleteTeam}
        onClose={() => setDeleteTeamId(null)}
      />
    </div>
  );
}
