import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, ChevronDown, Clock, Store } from "lucide-react";
import { getInitials } from "./utils";

function cn(...c) { return c.filter(Boolean).join(" "); }

// Até este número de lojas, mostramos abas (troca em 1 clique); acima, dropdown.
const MAX_TABS = 5;

function UnreadDot({ className = "" }) {
  return (
    <span className={cn("h-2 w-2 shrink-0 rounded-full bg-danger shadow-[0_0_8px_rgb(var(--danger))]", className)} />
  );
}

function StoreTabs({ accounts, selectedUserId, setSelectedUserId, hasDotForUserId }) {
  return (
    <div role="tablist" aria-label="Lojas" className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
      {accounts.map((a) => {
        const uid = String(a.user_id);
        const active = uid === String(selectedUserId);
        const dot = hasDotForUserId(uid);
        const name = a.nickname || `ID ${a.user_id}`;
        return (
          <button
            key={uid}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => setSelectedUserId(uid)}
            title={dot ? `${name} — há perguntas novas` : name}
            className={cn(
              "group relative flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm transition-all",
              active
                ? "border-brandSolid-400/50 bg-brandSolid-500/15 text-fg shadow-[0_0_18px_-6px_rgb(30_123_255/0.9)]"
                : "border-line/10 bg-surface/60 text-fg-muted hover:border-line/25 hover:text-fg"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-semibold",
                active ? "bg-brandSolid-500 text-white" : "bg-ink/[0.06] text-fg-muted group-hover:text-fg"
              )}
            >
              {getInitials(name)}
            </span>
            <span className="max-w-[150px] truncate font-medium">{name}</span>
            {dot && <UnreadDot />}
          </button>
        );
      })}
    </div>
  );
}

function StoreDropdown({ accounts, selectedUserId, setSelectedUserId, hasDotForUserId }) {
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
  const anyOtherDot = accounts.some((a) => String(a.user_id) !== String(selectedUserId) && hasDotForUserId(String(a.user_id)));

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl border border-line/15 bg-surface-2/80 hover:border-line/30 text-sm font-medium text-fg w-full sm:min-w-[200px] sm:w-auto transition-colors"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-lg border border-brandSolid-400/30 bg-brandSolid-500/10 shrink-0">
          <Store size={13} className="text-brandSolid-300" />
        </span>
        <span className="flex-1 text-left truncate">
          {selected?.nickname || (accounts.length === 0 ? "Nenhuma conta" : "Selecionar loja")}
        </span>
        {anyOtherDot && <UnreadDot />}
        <ChevronDown size={14} className={`shrink-0 text-fg-dim transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && accounts.length > 0 && (
        <div className="popover absolute left-0 top-full mt-1.5 w-full min-w-[230px] z-50 py-1">
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
                  isSelected ? "bg-brandSolid-500/15 text-fg font-medium" : "text-fg-muted hover:text-fg hover:bg-ink/[0.04]"
                )}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-ink/[0.06] text-[10px] font-semibold shrink-0">
                  {getInitials(a.nickname || String(a.user_id))}
                </span>
                <span className="flex-1 truncate">{a.nickname || `ID ${a.user_id}`}</span>
                {hasDot && <UnreadDot />}
                {isSelected && !hasDot && <Check size={14} className="shrink-0 text-glow" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Barra superior da caixa de entrada: troca de loja (abas ou dropdown),
 * filtro Pendentes/Respondidas e total de conversas.
 */
export function AccountSelector({
  accounts,
  selectedUserId,
  setSelectedUserId,
  hasDotForUserId,
  statusFilter,
  setStatusFilter,
  questionsCount,
}) {
  const storeProps = { accounts, selectedUserId, setSelectedUserId, hasDotForUserId };

  return (
    <div className="flex flex-col gap-3 shrink-0 2xl:flex-row 2xl:items-center">
      <div className="min-w-0 2xl:flex-1">
        {accounts.length > 1 && accounts.length <= MAX_TABS
          ? <StoreTabs {...storeProps} />
          : <StoreDropdown {...storeProps} />}
      </div>

      <div className="flex items-center gap-2">
        <div className="seg" role="group" aria-label="Filtrar perguntas">
          <button
            type="button"
            aria-pressed={statusFilter === "UNANSWERED"}
            onClick={() => setStatusFilter("UNANSWERED")}
            className="seg-btn flex items-center gap-1.5"
          >
            <Clock size={14} className={statusFilter === "UNANSWERED" ? "text-warn" : ""} /> Pendentes
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === "ANSWERED"}
            onClick={() => setStatusFilter("ANSWERED")}
            className="seg-btn flex items-center gap-1.5"
          >
            <CheckCircle2 size={14} className={statusFilter === "ANSWERED" ? "text-neon" : ""} /> Respondidas
          </button>
        </div>

        <span className="ml-auto 2xl:ml-0 text-xs px-3 py-2 rounded-lg border border-line/10 bg-surface/60 text-fg-muted whitespace-nowrap">
          <span className="num text-sm font-semibold text-fg">{questionsCount}</span>{" "}
          {questionsCount === 1 ? "conversa" : "conversas"}
        </span>
      </div>
    </div>
  );
}
