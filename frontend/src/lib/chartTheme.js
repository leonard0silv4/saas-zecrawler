/**
 * Tema dos gráficos Recharts (dark/neon). Cores via CSS vars: acompanham o tema claro/escuro sozinhas. Use os spreads nos componentes:
 *   <CartesianGrid {...chartGrid} />  <XAxis {...chartAxis} />  <Tooltip {...chartTooltipProps} content={<NeonTooltip />} />
 * Para glow nas linhas, renderize {ChartGlowDefs()} dentro do gráfico e use filter="url(#neon-glow)".
 */
export const chartColors = {
  brand: "#1e7bff",
  brandLight: "#4a95ff",
  glow: "rgb(var(--glow))",
  neon: "rgb(var(--neon))",
  warn: "rgb(var(--warn))",
  danger: "rgb(var(--danger))",
  violet: "#a78bfa",
  muted: "rgb(var(--fg-dim))",
};

/** Sequência para séries múltiplas / pizza. */
export const chartSeries = [chartColors.brand, chartColors.neon, chartColors.glow, chartColors.warn, chartColors.violet, chartColors.danger];

export const chartGrid = {
  stroke: "rgb(var(--line) / 0.08)",
  strokeDasharray: "3 6",
  vertical: false,
};

export const chartAxis = {
  stroke: "rgb(var(--line) / 0.12)",
  tick: { fill: "rgb(var(--fg-dim))", fontSize: 11 },
  tickLine: false,
  axisLine: false,
};

export const chartTooltipProps = {
  cursor: { stroke: "rgb(var(--glow) / 0.35)", strokeWidth: 1, fill: "rgb(var(--glow) / 0.05)" },
  wrapperStyle: { outline: "none" },
};

export const chartLegendProps = {
  wrapperStyle: { fontSize: 12, color: "rgb(var(--fg-muted))" },
  iconType: "circle",
  iconSize: 8,
};

/** Ponto ativo luminoso para Line/Area. */
export const neonActiveDot = (color = chartColors.neon) => ({
  r: 5,
  fill: color,
  stroke: "rgb(var(--void))",
  strokeWidth: 2,
  style: { filter: `drop-shadow(0 0 6px ${color})` },
});
