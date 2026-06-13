import { useRef, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { formatBRL } from "./formatBRL";

export function OrdersTab({ orders, loading }) {
  const parentRef = useRef(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => String(o.order_id).toLowerCase().includes(q));
  }, [orders, search]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 42,
    overscan: 10,
  });

  if (loading) return <p className="text-sm text-gray-400">Carregando…</p>;
  if (orders.length === 0) return <p className="text-sm text-gray-400">Sincronize os pedidos para listá-los aqui.</p>;

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nº do pedido…"
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 placeholder-gray-400"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum pedido encontrado.</p>
      ) : (
        <div ref={parentRef} className="overflow-auto rounded-lg" style={{ height: "480px" }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left py-2 pr-4 font-semibold">Data</th>
                <th className="text-left py-2 pr-4 font-semibold">Nº Pedido</th>
                <th className="text-left py-2 pr-4 font-semibold">Produto(s)</th>
                <th className="text-right py-2 pr-4 font-semibold">Valor</th>
                <th className="text-right py-2 pr-4 font-semibold">Taxa ML</th>
                <th className="text-right py-2 pr-4 font-semibold">Liq.</th>
                <th className="text-center py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {virtualizer.getVirtualItems()[0]?.start > 0 && (
                <tr><td colSpan={7} style={{ height: virtualizer.getVirtualItems()[0].start }} /></tr>
              )}
              {virtualizer.getVirtualItems().map((vRow) => {
                const o = filtered[vRow.index];
                return (
                  <tr key={o.order_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap text-xs">
                      {o.date_closed ? format(new Date(o.date_closed), "dd/MM/yy HH:mm") : "—"}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-gray-400">{o.order_id}</td>
                    <td className="py-2.5 pr-4 max-w-[200px]">
                      <span className="block font-medium">{o.order_items?.[0]?.title || "—"}</span>
                      {o.order_items?.length > 1 && (
                        <span className="text-xs text-gray-400">+{o.order_items.length - 1} item(s)</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold">{formatBRL(o.total_amount)}</td>
                    <td className="py-2.5 pr-4 text-right text-red-500 font-medium">{formatBRL(o.ml_fee)}</td>
                    <td className="py-2.5 pr-4 text-right text-green-700 font-semibold">
                      {formatBRL(o.total_amount - o.ml_fee)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        o.status === "paid"      ? "bg-green-100 text-green-700" :
                        o.status === "cancelled" ? "bg-red-100 text-red-700" :
                                                  "bg-gray-100 text-gray-600"
                      }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(() => {
                const items = virtualizer.getVirtualItems();
                const last = items[items.length - 1];
                if (!last) return null;
                const padBottom = virtualizer.getTotalSize() - last.end;
                return padBottom > 0 ? <tr><td colSpan={7} style={{ height: padBottom }} /></tr> : null;
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
