/**
 * Abas segmentadas. items: [{ value, label, icon? }]
 */
export function Tabs({ items, value, onChange, className = "" }) {
  return (
    <div role="tablist" className={`inline-flex gap-1 rounded-xl border border-line/10 bg-surface/60 p-1 ${className}`}>
      {items.map((it) => {
        const active = it.value === value;
        const Icon = it.icon;
        return (
          <button
            key={it.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              active
                ? "bg-brandSolid-500/20 text-fg shadow-[inset_0_0_0_1px_rgb(74_149_255/0.45),0_0_16px_-6px_rgb(30_123_255/0.8)]"
                : "text-fg-muted hover:text-fg hover:bg-ink/5",
            ].join(" ")}
          >
            {Icon && <Icon size={15} />}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
