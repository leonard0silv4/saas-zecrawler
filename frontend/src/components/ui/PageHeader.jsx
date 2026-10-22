/**
 * Cabeçalho padrão de página: título (Space Grotesk), descrição curta e ações à direita.
 * `icon` é um componente lucide opcional.
 */
export function PageHeader({ title, description, icon: Icon, actions, className = "" }) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brandSolid-400/30 bg-brandSolid-500/10 text-brandSolid-300 shadow-[0_0_20px_-6px_rgb(30_123_255/0.7)]">
            <Icon size={19} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-fg">{title}</h1>
          {description && <p className="mt-1 text-sm text-fg-muted max-w-2xl">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
