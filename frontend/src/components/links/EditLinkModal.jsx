import { Modal } from "../ui/Modal";

export function EditLinkModal({ isOpen, onClose, editLink, editMyPrice, setEditMyPrice, editTags, setEditTags, onSave, saving }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Link" size="sm">
      <p className="text-sm text-gray-500 mb-3 truncate">{editLink?.name || "Sem título"}</p>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 uppercase">Meu Preço</label>
          <input
            type="number"
            step="0.01"
            value={editMyPrice}
            onChange={(e) => setEditMyPrice(e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 uppercase">Tags (separadas por vírgula)</label>
          <input
            type="text"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            placeholder="minha-loja, promocao"
            className="w-full mt-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
          Cancelar
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}
