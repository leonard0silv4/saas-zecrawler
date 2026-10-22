import { Loader2, Package, Search } from "lucide-react";
import { Modal } from "../ui/Modal";

export function ProductSearchModal({
  open,
  onClose,
  products,
  productSearch,
  setProductSearch,
  loadingProducts,
  onInsert,
}) {
  function handleInsert(permalink) {
    onInsert(permalink);
    onClose();
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Buscar anúncio" size="sm">
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
          <input
            className="field w-full !pl-9 !pr-4"
            placeholder="Buscar produto..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* States */}
        {loadingProducts && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin text-fg-dim" />
          </div>
        )}

        {!loadingProducts && productSearch.trim() && products.length === 0 && (
          <p className="text-sm text-warn text-center py-4 font-medium">
            Nenhum anúncio ativo encontrado.
          </p>
        )}

        {!loadingProducts && !productSearch.trim() && products.length === 0 && (
          <p className="text-sm text-fg-dim text-center py-6">
            Digite para buscar seus anúncios.
          </p>
        )}

        {/* Product list */}
        {!loadingProducts && products.length > 0 && (
          <div className="divide-y divide-line/[0.07] border border-line/15 rounded-xl overflow-hidden">
            {products.map((p) => (
              <button
                key={p._id || p.id}
                type="button"
                onClick={() => handleInsert(p.permalink || "")}
                disabled={!p.permalink}
                className="w-full text-left px-4 py-3 hover:bg-ink/[0.03] flex gap-3 items-center transition-colors duration-150 disabled:opacity-40"
              >
                <div className="w-10 h-10 shrink-0 rounded-lg border border-line/15 bg-ink/[0.03] overflow-hidden flex items-center justify-center">
                  {p.thumbnail ? (
                    <img
                      src={p.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <Package size={16} className="text-fg-dim" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg line-clamp-1 font-medium">
                    {p.title || p.SKU || "Produto"}
                  </p>
                  <p className="text-xs text-brandSolid-300 truncate font-medium mt-0.5">
                    {p.permalink || "Sem permalink"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
