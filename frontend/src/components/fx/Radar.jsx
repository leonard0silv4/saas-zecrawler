/**
 * Radar HUD com varredura (cena "monitore concorrentes" do vídeo). Decorativo.
 * `blips`: pontos [x, y] em % (0–100) para marcar alvos.
 */
export function Radar({ size = 160, color = "var(--neon)", blips = [[68, 30], [28, 62], [74, 70]], className = "" }) {
  const c = (a) => `rgb(${color} / ${a})`;
  return (
    <div
      aria-hidden="true"
      className={`relative rounded-full overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${c(0.08)}, transparent 70%)`,
        boxShadow: `inset 0 0 0 1px ${c(0.35)}, 0 0 40px -10px ${c(0.5)}`,
      }}
    >
      {[0.72, 0.46, 0.2].map((s) => (
        <span
          key={s}
          className="absolute rounded-full"
          style={{ inset: `${((1 - s) / 2) * 100}%`, border: `1px solid ${c(0.22)}` }}
        />
      ))}
      <span className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: c(0.15) }} />
      <span className="absolute top-1/2 left-0 right-0 h-px" style={{ background: c(0.15) }} />
      <span
        className="absolute inset-0 animate-spin-slow rounded-full"
        style={{
          animationDuration: "4s",
          background: `conic-gradient(from 0deg, ${c(0.45)}, ${c(0.08)} 60deg, transparent 90deg)`,
        }}
      />
      {blips.map(([x, y], i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse-glow"
          style={{ left: `${x}%`, top: `${y}%`, background: c(1), boxShadow: `0 0 8px ${c(1)}`, animationDelay: `${i * 0.6}s` }}
        />
      ))}
    </div>
  );
}
