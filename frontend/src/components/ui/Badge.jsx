const variants = {
  blue:   "bg-brandSolid-500/15 text-brandSolid-300 ring-brandSolid-400/25",
  brand:  "bg-brandSolid-500/15 text-brandSolid-300 ring-brandSolid-400/25",
  green:  "bg-neon/10 text-neon ring-neon/25",
  red:    "bg-danger/10 text-danger ring-danger/25",
  amber:  "bg-warn/10 text-warn ring-warn/25",
  gray:   "bg-ink/5 text-fg-muted ring-ink/10",
  purple: "bg-violet-500/15 text-violet-300 ring-violet-400/25",
  pink:   "bg-pink-500/15 text-pink-300 ring-pink-400/25",
};

const sizes = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
};

export function Badge({ variant = "gray", size = "sm", className = "", children }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 font-medium rounded-full ring-1 ring-inset",
        variants[variant] ?? variants.gray,
        sizes[size] ?? sizes.sm,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
