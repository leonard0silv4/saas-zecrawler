import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-brand-600 hover:bg-brand-700 text-white border-transparent shadow-sm",
  secondary: "bg-white hover:bg-gray-50 text-gray-700 border-gray-200",
  ghost: "bg-transparent hover:bg-brand-50 text-brand-600 border-transparent",
  danger: "bg-red-600 hover:bg-red-700 text-white border-transparent shadow-sm",
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
        "transition duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1",
        "disabled:opacity-50 disabled:cursor-not-allowed",
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
