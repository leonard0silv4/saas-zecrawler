import { Info, CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";

const config = {
  info:    { box: "bg-brandSolid-500/10 border-brandSolid-400/30", accent: "text-brandSolid-300", icon: Info },
  success: { box: "bg-neon/10 border-neon/30",                     accent: "text-neon",            icon: CheckCircle2 },
  warning: { box: "bg-warn/10 border-warn/30",                     accent: "text-warn",            icon: AlertTriangle },
  error:   { box: "bg-danger/10 border-danger/30",                 accent: "text-danger",          icon: XCircle },
};

export function Alert({ variant = "info", title, children, onClose, className = "" }) {
  const c = config[variant] ?? config.info;
  const Icon = c.icon;
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${c.box} ${className}`} role="alert">
      <Icon size={18} className={`shrink-0 mt-0.5 ${c.accent}`} />
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold mb-0.5 ${c.accent}`}>{title}</p>}
        <div className="text-sm leading-relaxed text-fg/85">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-0.5 rounded text-fg-muted hover:text-fg transition-colors"
          aria-label="Fechar"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
