/**
 * Anel holográfico (a "plataforma" do vídeo). Puramente decorativo.
 * Use como elemento de fundo em heros; respeita prefers-reduced-motion via CSS global.
 */
export function HoloRing({ size = 320, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative ${className}`}
      style={{ width: size, height: size * 0.4 }}
    >
      <div
        className="absolute left-0"
        style={{ width: size, height: size, top: -size * 0.3, transform: "perspective(900px) rotateX(70deg)" }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
          <defs>
            <radialGradient id="hr-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgb(var(--glow))" stopOpacity="0.55" />
              <stop offset="60%" stopColor="rgb(30 123 255)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="rgb(30 123 255)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="98" fill="url(#hr-core)" />
          <g className="animate-spin-slow" style={{ transformOrigin: "100px 100px" }}>
            <circle cx="100" cy="100" r="92" fill="none" stroke="rgb(var(--glow) / 0.55)" strokeWidth="1" strokeDasharray="2 6" />
          </g>
          <circle cx="100" cy="100" r="76" fill="none" stroke="rgb(var(--glow) / 0.85)" strokeWidth="1.6" />
          <g className="animate-spin-slower" style={{ transformOrigin: "100px 100px" }}>
            <circle cx="100" cy="100" r="60" fill="none" stroke="rgb(30 123 255 / 0.75)" strokeWidth="3.5" strokeDasharray="40 22" />
          </g>
          <circle cx="100" cy="100" r="32" fill="none" stroke="rgb(var(--glow) / 0.9)" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
