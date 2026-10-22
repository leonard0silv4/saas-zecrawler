import { Modal } from "../ui/Modal";

export function EditLinkModal({ isOpen, onClose, editLink, editMyPrice, setEditMyPrice, editTags, setEditTags, onSave, saving }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Link" size="sm">
      <p className="text-sm text-fg-muted mb-3 truncate">{editLink?.name || "Sem título"}</p>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-fg-muted">Meu Preço</label>
          <input
            type="number"
            step="0.01"
            value={editMyPrice}
            onChange={(e) => setEditMyPrice(e.target.value)}
            className="field w-full mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-fg-muted">Tags (separadas por vírgula)</label>
          <input
            type="text"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            placeholder="minha-loja, promocao"
            className="field w-full mt-1"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-fg-muted">
          Cancelar
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="px-4 py-2 rounded-lg bg-brandSolid-500 text-white text-sm font-medium disabled:opacity-50 shadow-glow-brand"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}
