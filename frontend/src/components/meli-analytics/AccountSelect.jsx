import { useEffect, useRef, useState } from "react";
import { Store, ChevronDown, Check } from "lucide-react";

export function AccountSelect({ accounts, value, onChange, disabled = false }) {
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
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        disabled={disabled}
        aria-expanded={open}
        className={"flex items-center gap-2 px-3 py-2 rounded-xl border border-line/15 bg-surface-2/80 text-sm font-medium min-w-[175px] transition-colors " + (disabled ? "text-fg-dim opacity-50 cursor-not-allowed" : "text-fg hover:border-line/30")}
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-md border border-warn/30 bg-warn/10 shrink-0">
          <Store size={13} className="text-warn" />
        </span>
        <span className="flex-1 text-left truncate">
          {selected?.nickname || (accounts.length === 0 ? "Nenhuma conta" : "Selecionar loja")}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-fg-dim transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && accounts.length > 0 && (
        <div className="popover absolute left-0 top-full mt-1.5 w-full min-w-[220px] z-50 py-1">
          {accounts.map((a) => {
            const isSelected = String(a.user_id) === String(value);
            return (
              <button
                key={a.user_id}
                type="button"
                onClick={() => { onChange(String(a.user_id)); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                  isSelected ? "bg-brandSolid-500/15 text-fg font-medium" : "text-fg-muted hover:text-fg hover:bg-ink/[0.04]"
                }`}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-md border border-warn/25 bg-warn/10 shrink-0">
                  <Store size={13} className="text-warn" />
                </span>
                <span className="flex-1 truncate">{a.nickname || `ID ${a.user_id}`}</span>
                {isSelected && <Check size={14} className="shrink-0 text-glow" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
