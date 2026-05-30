export function WinLossBar({ winning, losing, total, winColor = "#10b981", loseColor = "#ef4444" }) {
  if (!total) return <p className="text-xs text-gray-400">Nenhum dado disponível</p>;
  const winPct = (winning / total) * 100;
  const losePct = (losing / total) * 100;
  const neutralPct = Math.max(0, 100 - winPct - losePct);
  const neutral = total - winning - losing;

  return (
    <div>
      <div className="flex h-8 gap-px overflow-hidden rounded-xl">
        {winPct > 0 && (
          <div
            className="flex items-center justify-center transition-all"
            style={{ width: `${winPct}%`, background: winColor }}
          >
            {winPct >= 12 && (
              <span className="text-white text-xs font-semibold">{winPct.toFixed(0)}%</span>
            )}
          </div>
        )}
        {neutralPct > 0 && (
          <div className="bg-gray-200/80" style={{ width: `${neutralPct}%` }} />
        )}
        {losePct > 0 && (
          <div
            className="flex items-center justify-center transition-all"
            style={{ width: `${losePct}%`, background: loseColor }}
          >
            {losePct >= 12 && (
              <span className="text-white text-xs font-semibold">{losePct.toFixed(0)}%</span>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: winColor }} />
          <span>Ganhando: <strong className="text-gray-700">{winning}</strong></span>
        </div>
        {neutral > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-gray-300" />
            <span>Sem comparação: <strong className="text-gray-700">{neutral}</strong></span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: loseColor }} />
          <span>Perdendo: <strong className="text-gray-700">{losing}</strong></span>
        </div>
      </div>
    </div>
  );
}
