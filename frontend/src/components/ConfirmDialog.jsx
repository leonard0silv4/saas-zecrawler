import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * ConfirmDialog — substitui window.confirm() em todo o sistema.
 *
 * Props:
 *   open          — boolean
 *   title         — string
 *   message       — string
 *   confirmLabel  — string  (default: "Confirmar")
 *   loading       — boolean (desativa botões enquanto a ação está em andamento)
 *   onConfirm     — () => void | Promise<void>
 *   onClose       — () => void
 */
export default function ConfirmDialog({
  open,
  title = "Confirmar",
  message,
  confirmLabel = "Confirmar",
  loading = false,
  onConfirm,
  onClose,
}) {
  /* Fecha com Escape */
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && !loading) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        {/* Ícone + título */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div className="flex-1 pt-1">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {message && (
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">{message}</p>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
