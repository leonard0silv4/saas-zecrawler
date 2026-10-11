import { chartColors } from "../../lib/chartTheme";

/**
 * <defs> reutilizáveis: filtro de brilho e gradientes de área.
 * Recharts ignora componentes desconhecidos como filhos — chamar como função
 * dentro do gráfico: {ChartGlowDefs()}
 * ids: neon-glow, area-brand, area-neon, area-glow
 */
export function ChartGlowDefs() {
  return (
    <defs>
      <filter id="neon-glow" x="-20%" y="-50%" width="140%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {[
        ["area-brand", chartColors.brand],
        ["area-neon", chartColors.neon],
        ["area-glow", chartColors.glow],
      ].map(([id, c]) => (
        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.35} />
          <stop offset="100%" stopColor={c} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  );
}
