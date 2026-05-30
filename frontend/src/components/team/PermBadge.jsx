import { MODULE_LABELS } from "./ModuleCheckbox";

export function PermBadge({ module }) {
  return (
    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">
      {MODULE_LABELS[module] || module}
    </span>
  );
}
