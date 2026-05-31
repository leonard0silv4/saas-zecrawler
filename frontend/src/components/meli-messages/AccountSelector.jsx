import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, ChevronDown, Clock, Store } from "lucide-react";

function cn(...c) { return c.filter(Boolean).join(" "); }

export function AccountSelector({
  accounts,
  selectedUserId,
  setSelectedUserId,
  hasDotForUserId,
  statusFilter,
  setStatusFilter,
  questionsCount,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = accounts.find((a) => String(a.user_id) === String(selectedUserId));
  const triggerHasDot = hasDotForUserId(selectedUserId);

  return (
    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
      {/* Store dropdown */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 min-w-[160px] transition-colors shadow-sm"
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-100 shrink-0">
            <Store size={13} className="text-brand-600" />
          </span>
          <span className="flex-1 text-left truncate">
            {selected?.nickname || (accounts.length === 0 ? "Nenhuma conta" : "Selecionar loja")}
          </span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
          {triggerHasDot && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
          )}
        </button>

        {open && accounts.length > 0 && (
          <div className="absolute left-0 top-full mt-1.5 w-full min-w-[210px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
            {accounts.map((a) => {
              const uid = String(a.user_id);
              const isSelected = uid === String(selectedUserId);
              const hasDot = hasDotForUserId(uid);
              return (
                <button
                  key={a.user_id}
                  type="button"
                  onClick={() => { setSelectedUserId(uid); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left",
                    isSelected ? "bg-brand-50 text-brand-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-100/60 shrink-0">
                    <Store size={13} className="text-brand-600" />
                  </span>
                  <span className="flex-1 truncate">{a.nickname || `ID ${a.user_id}`}</span>
                  {hasDot && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                  {isSelected && !hasDot && <Check size={14} className="shrink-0 text-brand-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Status filters */}
      <button
        type="button"
        onClick={() => setStatusFilter("UNANSWERED")}
        className={cn(
          "px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200 flex items-center gap-1.5",
          statusFilter === "UNANSWERED"
            ? "bg-brand-50 border-brand-300 text-brand-700 shadow-sm"
            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
        )}
      >
        <Clock size={14} /> Pendentes
      </button>
      <button
        type="button"
        onClick={() => setStatusFilter("ANSWERED")}
        className={cn(
          "px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200 flex items-center gap-1.5",
          statusFilter === "ANSWERED"
            ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
        )}
      >
        <CheckCircle2 size={14} /> Respondidas
      </button>

      {/* Count */}
      <span className="ml-auto text-xs font-semibold px-3 py-2 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 tabular-nums">
        {questionsCount} {questionsCount === 1 ? "conversa" : "conversas"}
      </span>
    </div>
  );
}
