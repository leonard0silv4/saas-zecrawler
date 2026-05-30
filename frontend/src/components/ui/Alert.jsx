import { Info, CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";

const config = {
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200 border-l-blue-500",
    text: "text-blue-800",
    icon: Info,
  },
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-200 border-l-emerald-500",
    text: "text-emerald-800",
    icon: CheckCircle2,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200 border-l-amber-500",
    text: "text-amber-800",
    icon: AlertTriangle,
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200 border-l-red-500",
    text: "text-red-800",
    icon: XCircle,
  },
};

export function Alert({ variant = "info", title, children, onClose, className = "" }) {
  const c = config[variant] ?? config.info;
  const Icon = c.icon;
  return (
    <div
      className={[
        "flex gap-3 rounded-lg border border-l-4 p-4",
        c.bg, c.border, className,
      ].join(" ")}
      role="alert"
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${c.text}`} />
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold mb-0.5 ${c.text}`}>{title}</p>}
        <div className={`text-sm leading-relaxed ${c.text}`}>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={`shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity ${c.text}`}
          aria-label="Fechar"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
