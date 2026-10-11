const variants = {
  default: "glass",
  elevated: "glass glow-top",
  bordered: "glass hud-corners",
};

/** Painel de vidro. `elevated` ganha linha de luz no topo; `bordered` ganha cantos HUD. */
export function Card({ variant = "default", className = "", children, onClick, padded = true }) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      className={[
        "rounded-2xl",
        padded ? "p-5 md:p-6" : "",
        variants[variant] ?? variants.default,
        interactive ? "cursor-pointer transition-colors duration-150 hover:border-line/25" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export const Panel = Card;
