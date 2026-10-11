import { ArrowUpRight, ArrowDownRight } from "lucide-react";

/**
 * Card de indicador do dashboard. `tone` define a cor do ícone/brilho:
 * brand | neon | danger | warn | glow | violet
 */
const tones = {
  brand:  "text-brandSolid-300 border-brandSolid-400/30 bg-brandSolid-500/10 shadow-[0_0_18px_-6px_rgb(30_123_255/0.8)]",
  neon:   "text-neon border-neon/30 bg-neon/10 shadow-[0_0_18px_-6px_rgb(var(--neon)/0.7)]",
  danger: "text-danger border-danger/30 bg-danger/10 shadow-[0_0_18px_-6px_rgb(var(--danger)/0.7)]",
  warn:   "text-warn border-warn/30 bg-warn/10 shadow-[0_0_18px_-6px_rgb(var(--warn)/0.6)]",
  glow:   "text-glow border-glow/30 bg-glow/10 shadow-[0_0_18px_-6px_rgb(var(--glow)/0.7)]",
  violet: "text-violet-300 border-violet-400/30 bg-violet-500/10 shadow-[0_0_18px_-6px_rgb(167_139_250/0.7)]",
};

export function StatCard({ icon: Icon, label, value, sub, tone = "brand", trend }) {
  return (
    <div className="glass rounded-2xl p-4 transition-colors hover:border-line/25">
      <div className="flex items-start justify-between">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${tones[tone] ?? tones.brand}`}>
          <Icon size={17} />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
            trend.direction === "up" ? "bg-neon/10 text-neon ring-neon/25" :
            trend.direction === "down" ? "bg-danger/10 text-danger ring-danger/25" :
            "bg-ink/5 text-fg-muted ring-ink/10"
          }`}>
            {trend.direction === "up" && <ArrowUpRight size={12} />}
            {trend.direction === "down" && <ArrowDownRight size={12} />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs text-fg-muted">{label}</p>
      <p className="mt-1 num text-2xl font-semibold text-fg">{value ?? "—"}</p>
      {sub && <p className="mt-0.5 text-xs text-fg-dim">{sub}</p>}
    </div>
  );
}

export function StatCardSkeleton() {
  return <div className="h-[124px] animate-pulse rounded-2xl border border-line/10 bg-ink/[0.03]" />;
}
