import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Loader2, Send, X } from "lucide-react";

export function ConfirmReplyModal({ open, onClose, onConfirm, question, replyText, sending }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!open) { setCountdown(5); return; }
    setCountdown(5);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && !sending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sending, onClose]);

  if (!open) return null;

  const canSend = countdown === 0 && !sending;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/70 backdrop-blur-md p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}
    >
      <div role="dialog" aria-modal="true" className="glass glow-top !bg-surface-2/95 rounded-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-line/10">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl border border-glow/30 bg-glow/10">
            <Eye size={17} className="text-glow" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-fg">Revise antes de enviar</h2>
            <p className="text-xs text-fg-dim">A resposta fica pública no anúncio do Mercado Livre.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-fg-dim hover:text-fg hover:bg-ink/5 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto">
          <div>
            <p className="text-xs text-fg-dim mb-2">Comprador perguntou</p>
            <div className="rounded-2xl rounded-bl-md bg-ink/[0.06] ring-1 ring-ink/[0.06] px-4 py-3">
              <p className="text-sm text-fg/90 leading-relaxed whitespace-pre-wrap">{question?.text || "—"}</p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <p className="text-xs text-brandSolid-300 mb-2">Você vai responder</p>
            <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-brandSolid-500 to-brandSolid-700 ring-1 ring-brandSolid-300/30 shadow-[0_8px_24px_-12px_rgb(30_123_255/0.9)] px-4 py-3 max-w-[90%]">
              <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{replyText || "—"}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-line/10">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2.5 rounded-xl border border-line/20 bg-surface-2/80 text-sm font-medium text-fg hover:bg-surface-3 disabled:opacity-40 transition-colors"
          >
            Editar resposta
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canSend}
            className={`relative overflow-hidden px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 min-w-[11rem] justify-center transition-all duration-300 ${
              canSend
                ? "bg-brandSolid-500 hover:bg-brandSolid-400 text-white shadow-glow-brand"
                : "bg-ink/[0.05] text-fg-muted border border-line/15 cursor-not-allowed"
            }`}
          >
            {!canSend && !sending && (
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-brandSolid-500/25 transition-[width] duration-1000 ease-linear"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {sending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Enviando...
                </>
              ) : countdown > 0 ? (
                <>Confirmar em <span className="num font-semibold text-fg">{countdown}s</span></>
              ) : (
                <>
                  <Send size={14} />
                  Confirmar envio
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
