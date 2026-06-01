import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Package, ArrowUp, ArrowDown } from "lucide-react";
import { RupturaAlert } from "./RupturaAlert";
import { formatBRL } from "./formatBRL";

const INVENTORY_FILTERS = [
  { label: "Todos",      value: "" },
  { label: "Full",       value: "full" },
  { label: "Normal",     value: "normal" },
  { label: "⚠️ Ruptura", value: "ruptura" },
];

const SORT_OPTIONS = [
  { value: "sold",     label: "Mais vendidos" },
  { value: "velocity", label: "Velocidade" },
  { value: "stock",    label: "Estoque" },
  { value: "price",    label: "Preço" },
];

export function InventoryTab({ inventory, loading, inventoryFilter, setInventoryFilter, inventorySort, setInventorySort, rupturaCount, onProductSelect }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: inventory.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10,
  });

  function handleSortClick(field) {
    setInventorySort((prev) => {
      if (prev.field !== field) {
        const defaultDir = field === "stock" ? "desc" : "asc";
        return { field, dir: defaultDir };
      }
      if (field === "stock") {
        if (prev.dir === "desc") return { field, dir: "asc" };
        return { field: null, dir: null };
      }
      if (prev.dir === "asc") return { field, dir: "desc" };
      return { field: null, dir: null };
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <RupturaAlert count={rupturaCount} />
        <div className="flex flex-wrap gap-2 ml-auto items-center">
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
            {SORT_OPTIONS.map((s) => {
              const isActive = inventorySort.field === s.value;
              const dir = isActive ? inventorySort.dir : null;
              return (
                <button
                  key={s.value}
                  onClick={() => handleSortClick(s.value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-semibold ${
                    isActive ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {s.label}
                  {dir === "asc"  && <ArrowUp  size={10} className="shrink-0" />}
                  {dir === "desc" && <ArrowDown size={10} className="shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1">
            {INVENTORY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setInventoryFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  inventoryFilter === f.value
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {inventory.length === 0 && loading ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : inventory.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum produto encontrado. Clique em Sincronizar para importar seus anúncios.</p>
      ) : (
        <div
          ref={parentRef}
          className={`overflow-auto rounded-lg transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : ""}`}
          style={{ height: "520px" }}
        >
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left py-2 pr-4 font-semibold">Produto</th>
                <th className="text-left py-2 pr-4 font-semibold">SKU</th>
                <th className="text-right py-2 pr-4 font-semibold">Preço</th>
                <th className="text-right py-2 pr-4 font-semibold">Total Vendido</th>
                <th className="text-right py-2 pr-4 font-semibold">un/dia</th>
                <th className="text-right py-2 pr-4 font-semibold">Estoque</th>
                <th className="text-center py-2 pr-4 font-semibold">Tipo</th>
                <th className="text-center py-2 font-semibold">Alerta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {virtualizer.getVirtualItems()[0]?.start > 0 && (
                <tr><td colSpan={8} style={{ height: virtualizer.getVirtualItems()[0].start }} /></tr>
              )}
              {virtualizer.getVirtualItems().map((vRow) => {
                const p = inventory[vRow.index];
                return (
                  <tr
                    key={p._id || p.id}
                    onClick={() => onProductSelect(p)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt="" className="w-8 h-8 rounded-lg object-contain shrink-0 border border-gray-100" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                            <Package size={12} className="text-gray-400" />
                          </div>
                        )}
                        <span className="max-w-[200px] font-medium">{p.title}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 font-mono text-xs">{p.SKU || "—"}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold">{formatBRL(p.price)}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-gray-700">{p.sold_quantity ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-right text-xs text-gray-500">
                      {p.averageSellDay > 0 ? p.averageSellDay.toFixed(1) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {p.isFull ? (
                        <span className={p.estoque_full === 0 ? "text-red-600 font-bold" : "font-medium"}>
                          {p.estoque_full ?? "—"}
                        </span>
                      ) : (
                        <span className="font-medium">{p.available_quantity ?? "—"}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.isFull ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {p.isFull ? "Full" : "Normal"}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      {p.alertRuptura ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.alertRuptura === "RUPTURA"  ? "bg-red-100 text-red-700" :
                          p.alertRuptura === "CRÍTICO"  ? "bg-orange-100 text-orange-700" :
                                                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {p.alertRuptura}
                        </span>
                      ) : (
                        <span className="text-gray-200">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(() => {
                const items = virtualizer.getVirtualItems();
                const last = items[items.length - 1];
                if (!last) return null;
                const padBottom = virtualizer.getTotalSize() - last.end;
                return padBottom > 0 ? <tr><td colSpan={8} style={{ height: padBottom }} /></tr> : null;
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
