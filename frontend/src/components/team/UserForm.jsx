import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { notifyWarning } from "../../utils/notify.js";
import { ModuleCheckbox, MODULE_LABELS } from "./ModuleCheckbox";

export function UserForm({ initial, planModules, teams, onSave, onCancel, isEdit }) {
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
