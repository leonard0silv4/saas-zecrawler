import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Modal } from "../ui/Modal";
import api from "../../services/api";
import { notifyError, notifyWarning } from "../../utils/notify.js";

export function ChangePasswordModal({ open, user, onClose }) {
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
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Alterar senha — ${user?.name}`}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-line/15 text-sm text-fg/90">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-brandSolid-500 text-white text-sm font-medium disabled:opacity-50 shadow-glow-brand"
          >
            {saving ? "Salvando..." : "Alterar senha"}
          </button>
        </div>
      }
    >
      <div>
        <label className="text-xs text-fg-muted block mb-1">Nova senha</label>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            className="field w-full !pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-2 top-2 text-fg-dim hover:text-fg/90"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
    </Modal>
  );
}
