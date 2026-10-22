/** Ponto pulsante "ao vivo". tone: neon | glow | warn | danger */
const tones = {
  neon: "bg-neon shadow-glow-neon",
  glow: "bg-glow",
  warn: "bg-warn",
  danger: "bg-danger",
};

export function LiveDot({ tone = "neon", className = "" }) {
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`}>
      <span className={`absolute inset-0 rounded-full animate-pulse-glow ${tones[tone] ?? tones.neon}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${tones[tone] ?? tones.neon}`} />
    </span>
  );
}
