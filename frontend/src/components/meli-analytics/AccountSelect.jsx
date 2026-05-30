import { useEffect, useRef, useState } from "react";
import { Store, ChevronDown, Check } from "lucide-react";

export function AccountSelect({ accounts, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = accounts.find((a) => String(a.user_id) === String(value));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 min-w-[175px] transition-colors shadow-sm"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-yellow-400/20 shrink-0">
          <Store size={13} className="text-yellow-600" />
        </span>
        <span className="flex-1 text-left truncate">
          {selected?.nickname || (accounts.length === 0 ? "Nenhuma conta" : "Selecionar loja")}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && accounts.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[220px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
          {accounts.map((a) => {
            const isSelected = String(a.user_id) === String(value);
            return (
              <button
                key={a.user_id}
                type="button"
                onClick={() => { onChange(String(a.user_id)); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                  isSelected ? "bg-green-50 text-green-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-yellow-400/15 shrink-0">
                  <Store size={13} className="text-yellow-600" />
                </span>
                <span className="flex-1 truncate">{a.nickname || `ID ${a.user_id}`}</span>
                {isSelected && <Check size={14} className="shrink-0 text-green-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
