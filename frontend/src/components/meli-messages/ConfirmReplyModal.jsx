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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-50">
            <Eye size={17} className="text-brand-600" />
          </div>
          <h2 className="flex-1 text-base font-bold text-gray-900">Revisão da Resposta</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Pergunta do comprador */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Cliente Perguntou
            </p>
            <div className="border-l-4 border-slate-400 bg-slate-50 rounded-r-xl px-4 py-3">
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {question?.text || "—"}
              </p>
            </div>
          </div>

          {/* Resposta do vendedor */}
          <div>
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2 text-right">
              Você Responderá
            </p>
            <div className="border-r-4 border-brand-500 bg-brand-50 rounded-l-xl px-4 py-3">
              <p className="text-sm text-brand-900 leading-relaxed whitespace-pre-wrap text-right">
                {replyText || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 disabled:opacity-40 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canSend}
            className={`
              px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2.5 min-w-[11rem] justify-center
              transition-all duration-300
              ${canSend
                ? "bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow-md"
                : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              }
            `}
          >
            {sending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Enviando...
              </>
            ) : countdown > 0 ? (
              <span className="text-lg font-black tabular-nums">{countdown}</span>
            ) : (
              <>
                <Send size={14} />
                Confirmar envio
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
