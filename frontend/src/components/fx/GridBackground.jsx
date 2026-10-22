/**
 * Fundo global: grade em perspectiva + brilho azul no horizonte + poeira estelar.
 * Fixo atrás do conteúdo, sem interação.
 */
export function GridBackground({ className = "" }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none fixed inset-0 -z-0 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgb(30 123 255 / 0.16), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 100%, rgb(var(--glow) / 0.06), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--line) / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--line) / 0.07) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 75%)",
        }}
      />
      <div
        className="dark-only absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 18%, rgb(180 220 255 / 0.5), transparent), radial-gradient(1px 1px at 72% 12%, rgb(180 220 255 / 0.4), transparent), radial-gradient(1px 1px at 38% 64%, rgb(180 220 255 / 0.25), transparent), radial-gradient(1.5px 1.5px at 88% 42%, rgb(var(--glow) / 0.5), transparent), radial-gradient(1px 1px at 22% 86%, rgb(180 220 255 / 0.3), transparent), radial-gradient(1px 1px at 58% 32%, rgb(180 220 255 / 0.3), transparent)",
        }}
      />
    </div>
  );
}
