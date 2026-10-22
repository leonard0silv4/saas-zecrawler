import { Modal } from "../ui/Modal";

export function AddLinkModal({ isOpen, onClose, newLink, setNewLink, onSubmit, adding }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Link" size="sm">
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="url"
          required
          placeholder="URL do produto"
          value={newLink.link}
          onChange={(e) => setNewLink({ ...newLink, link: e.target.value })}
          className="field w-full"
        />
        <div className="flex gap-3">
          <input
            type="number"
            step="0.01"
            placeholder="Meu preço"
            value={newLink.myPrice}
            onChange={(e) => setNewLink({ ...newLink, myPrice: e.target.value })}
            className="field flex-1"
          />
          <input
            type="text"
            placeholder="Tag (opcional)"
            value={newLink.tag}
            onChange={(e) => setNewLink({ ...newLink, tag: e.target.value })}
            className="field flex-1"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="w-full py-2.5 bg-brandSolid-500 text-white rounded-lg font-medium text-sm hover:bg-brandSolid-400 disabled:opacity-50 shadow-glow-brand"
        >
          {adding ? "Salvando..." : "Adicionar"}
        </button>
      </form>
    </Modal>
  );
}
