import { useState } from "react";
import { Check } from "lucide-react";
import { notifyWarning } from "../../utils/notify.js";
import { ModuleCheckbox, MODULE_LABELS } from "./ModuleCheckbox";

export function TeamForm({ initial, planModules, onSave, onCancel, isEdit }) {
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
