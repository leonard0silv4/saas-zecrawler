/** Estado vazio: ícone dentro de anel luminoso, título, texto e ação. */
export function EmptyState({ icon: Icon, title, description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-14 ${className}`}>
      {Icon && (
        <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-glow/30 bg-glow/5 text-glow">
          <span className="absolute inset-[-6px] rounded-full border border-dashed border-glow/20 animate-spin-slow" />
          <Icon size={22} />
        </div>
      )}
      {title && <h3 className="text-base font-semibold text-fg">{title}</h3>}
      {description && <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
