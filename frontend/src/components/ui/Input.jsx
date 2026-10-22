export function Input({
  label,
  id,
  error,
  helperText,
  disabled = false,
  className = "",
  ...props
}) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-fg/90">
          {label}
        </label>
      )}
      <input
        id={inputId}
        disabled={disabled}
        className={`field ${error ? "!border-danger/60" : ""}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {!error && helperText && <p className="text-xs text-fg-dim">{helperText}</p>}
    </div>
  );
}

export function Select({ label, id, className = "", children, ...props }) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-fg/90">
          {label}
        </label>
      )}
      <select id={selectId} className="field pr-8" {...props}>
        {children}
      </select>
    </div>
  );
}
