/** tone: neon | brand | violet | warn | glow */
const tones = {
  neon:   "text-neon border-neon/30 bg-neon/10",
  brand:  "text-brandSolid-300 border-brandSolid-400/30 bg-brandSolid-500/10",
  violet: "text-violet-300 border-violet-400/30 bg-violet-500/10",
  warn:   "text-warn border-warn/30 bg-warn/10",
  glow:   "text-glow border-glow/30 bg-glow/10",
};

export function KpiCard({ icon: Icon, label, value, sub, tone = "brand" }) {
  return (
    <div className="glass glow-top rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">{label}</p>
        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border ${tones[tone] ?? tones.brand}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-2 num text-2xl font-semibold text-fg">{value}</p>
      {sub && <p className="text-xs text-fg-dim mt-1">{sub}</p>}
    </div>
  );
}
