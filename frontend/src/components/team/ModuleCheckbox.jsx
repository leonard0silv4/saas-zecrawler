const MODULE_LABELS = {
  links: "Links",
  priceAnalyze: "Análise de Preços",
  catalog: "Catálogo",
  meli: "Contas Mercado Livre",
  meliMessages: "Mensagens ML",
  meliAnalytics: "Analytics ML",
  meliCatalog:   "Catálogo ML",
  sellerMonitor: "Monitor Sellers",
};

export { MODULE_LABELS };

export function ModuleCheckbox({ module, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(module, e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm text-gray-700">{MODULE_LABELS[module] || module}</span>
    </label>
  );
}
