import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/70 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="glass w-full max-w-sm rounded-2xl !bg-surface-2/95 p-6 space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full border border-danger/40 bg-danger/10 flex items-center justify-center shadow-[0_0_18px_-4px_rgb(var(--danger)/0.6)]">
                <AlertTriangle size={19} className="text-danger" />
              </div>
              <div className="flex-1 pt-1">
                <h2 className="text-base font-semibold text-fg">{title}</h2>
                {message && <p className="mt-1 text-sm text-fg-muted leading-relaxed">{message}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-line/20 bg-surface-2/80 text-sm font-medium text-fg hover:bg-surface-3 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-danger/50 bg-danger/20 hover:bg-danger/30 text-danger text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
