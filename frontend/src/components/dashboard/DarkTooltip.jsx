export function DarkTooltip({ active, payload, label, total }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2.5 text-[11px] shadow-xl">
      {label && <p className="mb-1 text-[10px] text-gray-400">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="my-0.5">
          {p.name}: <strong className="text-white">
            {p.value}{total ? ` (${((p.value / total) * 100).toFixed(1)}%)` : ""}
          </strong>
        </p>
      ))}
    </div>
  );
}
