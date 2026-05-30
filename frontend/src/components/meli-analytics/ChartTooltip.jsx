import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "./formatBRL";

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const receita = payload.find((p) => p.dataKey === "receita")?.value ?? 0;
  const pedidos  = payload.find((p) => p.dataKey === "pedidos")?.value  ?? 0;
  let dateLabel = label;
  try { dateLabel = format(parseISO(label), "EEE, dd/MM/yyyy", { locale: ptBR }); } catch { /* noop */ }
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[170px]">
      <p className="text-xs text-gray-500 mb-2 capitalize">{dateLabel}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          Receita
        </span>
        <span className="font-semibold text-green-700">{formatBRL(receita)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 mt-1">
        <span className="flex items-center gap-1.5 text-gray-600">
          <span className="w-2.5 h-2.5 rounded bg-green-200 inline-block" />
          Pedidos
        </span>
        <span className="font-semibold text-gray-700">{pedidos}</span>
      </div>
    </div>
  );
}
