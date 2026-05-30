import { AlertTriangle } from "lucide-react";

export function RupturaAlert({ count }) {
  if (!count) return null;
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      <AlertTriangle size={16} className="shrink-0" />
      <span>
        <strong>{count}</strong> produto{count > 1 ? "s" : ""} com{" "}
        <strong>Ruptura de Estoque Full</strong>. Reponha para evitar pausas.
      </span>
    </div>
  );
}
