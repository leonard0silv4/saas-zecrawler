import { chartColors } from "../../lib/chartTheme";

export function WinLossBar({ winning, losing, total, winColor = chartColors.neon, loseColor = chartColors.danger }) {
  if (!total) return <p className="text-xs text-fg-dim">Nenhum dado disponível</p>;
  const winPct = (winning / total) * 100;
  const losePct = (losing / total) * 100;
  const neutralPct = Math.max(0, 100 - winPct - losePct);
  const neutral = total - winning - losing;

  return (
    <div>
      <div className="flex h-3 gap-1 rounded-full">
        {winPct > 0 && (
          <div
            className="rounded-full transition-all"
            style={{ width: `${winPct}%`, background: winColor, boxShadow: `0 0 14px -2px ${winColor}` }}
          />
        )}
        {neutralPct > 0 && <div className="rounded-full bg-ink/10" style={{ width: `${neutralPct}%` }} />}
        {losePct > 0 && (
          <div
            className="rounded-full transition-all"
            style={{ width: `${losePct}%`, background: loseColor, boxShadow: `0 0 14px -2px ${loseColor}` }}
          />
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-fg-muted">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: winColor, boxShadow: `0 0 6px ${winColor}` }} />
          Ganhando <strong className="num text-sm text-fg">{winning}</strong>
          <span className="text-fg-dim">{winPct.toFixed(0)}%</span>
        </div>
        {neutral > 0 && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ink/25" />
            Sem comparação <strong className="num text-sm text-fg">{neutral}</strong>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: loseColor, boxShadow: `0 0 6px ${loseColor}` }} />
          Perdendo <strong className="num text-sm text-fg">{losing}</strong>
          <span className="text-fg-dim">{losePct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
