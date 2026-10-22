/**
 * Tooltip padrão dos gráficos (vidro escuro).
 * Props extras: `total` (mostra % de cada valor), `formatValue(v, entry)`, `formatLabel(label)`.
 */
export function NeonTooltip({ active, payload, label, total, formatValue, formatLabel }) {
  if (!active || !payload?.length) return null;
  const shownLabel = formatLabel ? formatLabel(label) : label;
  return (
    <div className="glass rounded-xl !bg-surface-2/95 px-3.5 py-2.5 text-xs min-w-[150px]">
      {shownLabel != null && shownLabel !== "" && (
        <p className="mb-1.5 text-[11px] text-fg-dim capitalize">{shownLabel}</p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-fg-muted">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: p.color || p.payload?.fill, boxShadow: `0 0 8px ${p.color || p.payload?.fill}` }}
            />
            {p.name}
          </span>
          <span className="num font-semibold text-fg">
            {formatValue ? formatValue(p.value, p) : p.value}
            {total ? <span className="ml-1 font-normal text-fg-dim">({((p.value / total) * 100).toFixed(1)}%)</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
