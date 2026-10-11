import { Loader2 } from "lucide-react";

const variants = {
  primary:
    "bg-brandSolid-500 hover:bg-brandSolid-400 text-white border-brandSolid-400/60 shadow-glow-brand",
  secondary:
    "bg-surface-2/80 hover:bg-surface-3 text-fg border-line/20 hover:border-line/35",
  ghost: "bg-transparent hover:bg-brandSolid-500/10 text-brandSolid-300 border-transparent",
  danger: "bg-danger/15 hover:bg-danger/25 text-danger border-danger/40",
};

const sizes = {
  sm: "text-sm px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
  lg: "text-base px-5 py-2.5 gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  className = "",
  children,
  ...props
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center font-medium rounded-lg border",
        "transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-glow/70",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className,
      ].join(" ")}
      {...props}
    >
      {loading && <Loader2 size={size === "sm" ? 13 : 15} className="animate-spin shrink-0" />}
      {children}
    </button>
  );
}
