/**
 * Mini gráfico SVG sem eixos. variant: "area" | "bars".
 * Mantém proporção pelo viewBox; largura acompanha o container.
 */
export function Sparkline({ data = [], variant = "area", color = "rgb(var(--glow))", height = 48, className = "" }) {
  const values = data.map((v) => Number(v) || 0);
  if (values.length < 2) {
    return <div className={className} style={{ height }} />;
  }
  const w = 120;
  const h = 40;
  const max = Math.max(...values, 1);
  const id = `spark-${color.replace(/[^a-z0-9]/gi, "")}-${variant}`;

  if (variant === "bars") {
    const bw = w / values.length;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`w-full ${className}`} style={{ height }} aria-hidden="true">
        {values.map((v, i) => {
          const bh = Math.max(1.5, (v / max) * (h - 2));
          return (
            <rect
              key={i}
              x={i * bw + bw * 0.18}
              y={h - bh}
              width={bw * 0.64}
              height={bh}
              rx={0.8}
              fill={color}
              opacity={0.35 + 0.65 * (v / max)}
            />
          );
        })}
      </svg>
    );
  }

  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 3 - (v / max) * (h - 8)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`w-full overflow-visible ${className}`} style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      <circle cx={lx} cy={ly} r="2.2" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}
