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
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        disabled={disabled}
        className={[
          "w-full rounded-lg border px-3 py-2 text-sm text-gray-900",
          "placeholder:text-gray-400 bg-white",
          "transition duration-150 focus:outline-none focus:ring-2",
          error
            ? "border-red-300 focus:ring-red-500 focus:border-red-300"
            : "border-gray-300 focus:ring-brand-500 focus:border-brand-500",
          disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "",
        ].join(" ")}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      {!error && helperText && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
