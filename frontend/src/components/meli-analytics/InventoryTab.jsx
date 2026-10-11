import { useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Package, ArrowUp, ArrowDown, AlertTriangle, AlertCircle, Search, HelpCircle } from "lucide-react";
import { RupturaAlert } from "./RupturaAlert";
import { formatBRL } from "./formatBRL";

const TYPE_FILTERS = [
  { label: "Todos",  value: "" },
  { label: "Full",   value: "full" },
  { label: "Normal", value: "normal" },
];

const STATUS_FILTERS = [
  { label: "Ativos", value: "active" },
  { label: "Todos",  value: "all" },
];

const ALERT_FILTERS = [
  { label: "Ruptura", value: "ruptura", icon: AlertTriangle, iconColor: "text-danger" },
  { label: "Crítico", value: "critico", icon: AlertCircle,   iconColor: "text-warn" },
];

const SORT_OPTIONS = [
  { value: "sold",     label: "Mais vendidos" },
  { value: "velocity", label: "Velocidade" },
  { value: "stock",    label: "Estoque" },
  { value: "price",    label: "Preço" },
];

export function InventoryTab({ inventory, loading, inventoryType, setInventoryType, inventoryStatus, setInventoryStatus, inventoryAlert, setInventoryAlert, inventorySort, setInventorySort, rupturaCount, onProductSelect }) {
  const parentRef = useRef(null);
  const debounceRef = useRef(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  function handleSearch(value) {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const filteredInventory = debouncedSearch
    ? inventory.filter((p) => {
        const q = debouncedSearch.toLowerCase();
        return p.title?.toLowerCase().includes(q) || p.SKU?.toLowerCase().includes(q);
      })
    : inventory;

  const virtualizer = useVirtualizer({
    count: filteredInventory.length,
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
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nome ou SKU..."
          className="field !pl-8"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <RupturaAlert count={rupturaCount} />
        <div className="flex flex-wrap gap-2 ml-auto items-center">
          <div className="seg !p-0.5 text-xs">
            {SORT_OPTIONS.map((s) => {
              const isActive = inventorySort.field === s.value;
              const dir = isActive ? inventorySort.dir : null;
              return (
                <button
                  key={s.value}
                  onClick={() => handleSortClick(s.value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-semibold ${
                    isActive ? "seg-btn-active" : "text-fg-muted hover:text-fg/90"
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
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setInventoryType(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  inventoryType === f.value
                    ? "bg-brandSolid-500/20 text-fg ring-1 ring-inset ring-brandSolid-400/50 shadow-[0_0_14px_-6px_rgb(30_123_255/0.9)]"
                    : "bg-ink/[0.06] text-fg-muted hover:bg-ink/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setInventoryStatus(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  inventoryStatus === f.value
                    ? "bg-brandSolid-500/20 text-fg ring-1 ring-inset ring-brandSolid-400/50 shadow-[0_0_14px_-6px_rgb(30_123_255/0.9)]"
                    : "bg-ink/[0.06] text-fg-muted hover:bg-ink/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {ALERT_FILTERS.map((f) => {
              const Icon = f.icon;
              const isActive = inventoryAlert === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setInventoryAlert(isActive ? "" : f.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-brandSolid-500/20 text-fg ring-1 ring-inset ring-brandSolid-400/50 shadow-[0_0_14px_-6px_rgb(30_123_255/0.9)]"
                      : "bg-ink/[0.06] text-fg-muted hover:bg-ink/10"
                  }`}
                >
                  <Icon size={12} className={isActive ? "text-fg" : f.iconColor} />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {inventory.length === 0 && loading ? (
        <p className="text-sm text-fg-dim">Carregando…</p>
      ) : inventory.length === 0 ? (
        <p className="text-sm text-fg-dim">Nenhum produto encontrado. Clique em Sincronizar para importar seus anúncios.</p>
      ) : filteredInventory.length === 0 ? (
        <p className="text-sm text-fg-dim">Nenhum produto encontrado para "{debouncedSearch}".</p>
      ) : (
        <div
          ref={parentRef}
          className={`overflow-auto rounded-lg transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : ""}`}
          style={{ height: "520px" }}
        >
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface-2">
              <tr className="border-b border-line/10 text-xs text-fg-dim">
                <th className="text-left py-2 pr-4 font-semibold">Produto</th>
                <th className="text-left py-2 pr-4 font-semibold">SKU</th>
                <th className="text-left py-2 pr-4 font-semibold">Loja</th>
                <th className="text-right py-2 pr-4 font-semibold">Preço</th>
                <th className="text-right py-2 pr-4 font-semibold">Total Vendido</th>
                <th className="text-right py-2 pr-4 font-semibold">un/dia</th>
                <th className="text-right py-2 pr-4 font-semibold">Estoque</th>
                <th className="text-center py-2 pr-4 font-semibold">Tipo</th>
                <th className="text-center py-2 font-semibold">Alerta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/[0.07]">
              {virtualizer.getVirtualItems()[0]?.start > 0 && (
                <tr><td colSpan={9} style={{ height: virtualizer.getVirtualItems()[0].start }} /></tr>
              )}
              {virtualizer.getVirtualItems().map((vRow) => {
                const p = filteredInventory[vRow.index];
                return (
                  <tr
                    key={p._id || p.id}
                    ref={virtualizer.measureElement}
                    data-index={vRow.index}
                    onClick={() => onProductSelect(p)}
                    className="hover:bg-ink/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt="" className="w-8 h-8 rounded-lg object-contain shrink-0 border border-line/10" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-ink/[0.06] shrink-0 flex items-center justify-center">
                            <Package size={12} className="text-fg-dim" />
                          </div>
                        )}
                        <span className="max-w-[200px] font-medium">{p.title}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-fg-dim font-mono text-xs">{p.SKU || "—"}</td>
                    <td className="py-2.5 pr-4 text-xs text-fg-muted max-w-[120px] truncate">{p.nickname || "—"}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold">{formatBRL(p.price)}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-fg/90">{p.sold_quantity ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-right text-xs text-fg-muted">
                      {p.averageSellDay > 0 ? p.averageSellDay.toFixed(1) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {p.isFull ? (
                        <span className="inline-flex items-center gap-1 justify-end">
                          <span className={p.estoque_full === 0 ? "text-danger font-bold" : "font-medium"}>
                            {p.estoque_full ?? "—"}
                          </span>
                          {p.estoqueFullSource === "fallback_item" && (
                            <HelpCircle
                              size={12}
                              className="text-warn shrink-0"
                              title="Estoque Full estimado — API de fulfillment indisponível para este item"
                            />
                          )}
                        </span>
                      ) : (
                        <span className="font-medium">{p.available_quantity ?? "—"}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.isFull ? "bg-neon/15 text-neon" : "bg-ink/[0.06] text-fg-muted"
                      }`}>
                        {p.isFull ? "Full" : "Normal"}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      {p.alertRuptura ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.alertRuptura === "RUPTURA"  ? "bg-danger/15 text-danger" :
                          p.alertRuptura === "CRÍTICO"  ? "bg-warn/15 text-warn" :
                                                          "bg-warn/15 text-warn"
                        }`}>
                          {p.alertRuptura}
                        </span>
                      ) : (
                        <span className="text-fg-dim/40">—</span>
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
                return padBottom > 0 ? <tr><td colSpan={9} style={{ height: padBottom }} /></tr> : null;
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
