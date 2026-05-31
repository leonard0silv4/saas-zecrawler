import { useEffect, useRef } from "react";
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
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleInsert(permalink) {
    onInsert(permalink);
    onClose();
  }

  const hasQuery = productSearch.trim().length > 0;

  return (
    <Modal isOpen={open} onClose={onClose} size="sm" title="Inserir Link de Anúncio">
      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 focus:bg-white transition-all duration-200 placeholder-gray-400"
            placeholder="Buscar anúncio por nome ou SKU..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </div>

        {loadingProducts && (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        )}

        {!loadingProducts && !hasQuery && products.length === 0 && (
          <div className="py-10 flex flex-col items-center gap-2.5 text-center">
            <Package size={28} className="text-gray-200" />
            <p className="text-sm text-gray-400">Digite para buscar seus anúncios.</p>
          </div>
        )}

        {!loadingProducts && hasQuery && products.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-amber-700 font-medium">
              Nenhum anúncio encontrado para &ldquo;{productSearch}&rdquo;.
            </p>
          </div>
        )}

        {!loadingProducts && products.length > 0 && (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {products.map((p) => (
              <div
                key={p._id || p.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/40 transition-all duration-150"
              >
                <div className="w-10 h-10 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
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
                    <Package size={16} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                    {p.title || p.SKU || "Produto"}
                  </p>
                  <p className="text-xs text-brand-600 truncate">{p.permalink || "Sem permalink"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInsert(p.permalink || "")}
                  disabled={!p.permalink}
                  className="shrink-0 px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 active:bg-brand-800 transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-40"
                >
                  Inserir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
