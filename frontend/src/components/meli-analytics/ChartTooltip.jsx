import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "./formatBRL";
import { chartColors } from "../../lib/chartTheme";

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const receita = payload.find((p) => p.dataKey === "receita")?.value ?? 0;
  const pedidos  = payload.find((p) => p.dataKey === "pedidos")?.value  ?? 0;
  let dateLabel = label;
  try { dateLabel = format(parseISO(label), "EEE, dd/MM/yyyy", { locale: ptBR }); } catch { /* noop */ }
  return (
    <div className="glass rounded-xl !bg-surface-2/95 px-4 py-3 text-sm min-w-[180px]">
      <p className="text-xs text-fg-dim mb-2 capitalize">{dateLabel}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-fg-muted">
          <span className="w-2 h-2 rounded-full" style={{ background: chartColors.neon, boxShadow: `0 0 8px ${chartColors.neon}` }} />
          Receita
        </span>
        <span className="num font-semibold text-neon">{formatBRL(receita)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 mt-1">
        <span className="flex items-center gap-1.5 text-fg-muted">
          <span className="w-2 h-2 rounded-sm" style={{ background: chartColors.brand }} />
          Pedidos
        </span>
        <span className="num font-semibold text-fg">{pedidos}</span>
      </div>
    </div>
  );
}
