import { MODULE_LABELS } from "../../lib/moduleLabels";

export { MODULE_LABELS };

export function ModuleCheckbox({ module, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(module, e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-line/25 text-brandSolid-300 focus:ring-brandSolid-500/25"
      />
      <span className="text-sm text-fg/90">{MODULE_LABELS[module] || module}</span>
    </label>
  );
}
