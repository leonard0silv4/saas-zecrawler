/**
 * Logo para fundo escuro: marca hexagonal (mesma da logo.png) em SVG + nome em texto.
 * `compact` mostra só a marca.
 */
export function BrandMark({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="bm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#bm-glow)">
        <path
          d="M24 3.5 41.8 13.75v20.5L24 44.5 6.2 34.25v-20.5Z"
          stroke="#1e7bff"
          strokeWidth="2.6"
          strokeLinejoin="round"
          fill="rgb(30 123 255 / 0.08)"
        />
        <path d="M24 14v20M14 24h20" stroke="#4a95ff" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="24" cy="24" r="4.2" fill="#1e7bff" />
        <circle cx="24" cy="13" r="3" fill="#1e7bff" />
        <circle cx="24" cy="35" r="3" fill="#1e7bff" />
        <circle cx="13" cy="24" r="3" fill="#1e7bff" />
        <circle cx="35" cy="24" r="3" fill="#1e7bff" />
      </g>
    </svg>
  );
}

export default function BrandLogo({ size = 32, compact = false, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      {!compact && (
        <span
          className="font-display font-semibold tracking-tight text-fg leading-none"
          style={{ fontSize: size * 0.62 }}
        >
          ML SmartHub
        </span>
      )}
    </span>
  );
}
