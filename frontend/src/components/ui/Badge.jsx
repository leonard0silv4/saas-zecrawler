const variants = {
  blue:   "bg-blue-50 text-blue-700",
  green:  "bg-emerald-50 text-emerald-700",
  red:    "bg-red-50 text-red-700",
  gray:   "bg-gray-100 text-gray-600",
  amber:  "bg-amber-50 text-amber-700",
  purple: "bg-violet-50 text-violet-700",
  pink:   "bg-pink-50 text-pink-700",
  brand:  "bg-brand-50 text-brand-700",
};

const sizes = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
};

export function Badge({ variant = "gray", size = "sm", className = "", children }) {
  return (
    <span
      className={[
        "inline-flex items-center font-medium rounded-full",
        variants[variant] ?? variants.gray,
        sizes[size] ?? sizes.sm,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
