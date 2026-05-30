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
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
        />
        <div className="flex gap-3">
          <input
            type="number"
            step="0.01"
            placeholder="Meu preço"
            value={newLink.myPrice}
            onChange={(e) => setNewLink({ ...newLink, myPrice: e.target.value })}
            className="flex-1 px-2 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
          />
          <input
            type="text"
            placeholder="Tag (opcional)"
            value={newLink.tag}
            onChange={(e) => setNewLink({ ...newLink, tag: e.target.value })}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {adding ? "Salvando..." : "Adicionar"}
        </button>
      </form>
    </Modal>
  );
}
