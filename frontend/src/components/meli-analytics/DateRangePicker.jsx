import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange } from "lucide-react";
import "react-day-picker/style.css";

const calendarStyles = `
  .drp-root {
    --rdp-accent-color: rgb(var(--glow));
    --rdp-accent-background-color: rgb(30 123 255 / 0.22);
    --rdp-selected-color: rgb(var(--surface));
    --rdp-today-color: rgb(var(--neon));
    --rdp-range_start-color: rgb(var(--surface));
    --rdp-range_end-color: rgb(var(--surface));
    --rdp-range_start-date-background-color: rgb(var(--glow));
    --rdp-range_end-date-background-color: rgb(var(--glow));
    --rdp-range_middle-background-color: rgb(30 123 255 / 0.22);
    color: rgb(var(--fg));
  }
  .drp-root .rdp-root {
    --rdp-day-width: 36px;
    --rdp-day-height: 36px;
  }
  .drp-root .rdp-day_button {
    border-radius: 8px;
    font-size: 13px;
  }
  .drp-root .rdp-range_middle .rdp-day_button {
    color: rgb(var(--fg));
  }
  .drp-root .rdp-caption_label {
    font-size: 14px;
    font-weight: 600;
  }
  .drp-root .rdp-chevron { fill: rgb(var(--glow)); }
  .drp-root .rdp-weekday {
    font-size: 11px;
    font-weight: 600;
    color: rgb(var(--fg-dim));
  }
`;

export function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [localRange, setLocalRange] = useState(value ?? undefined);
  const containerRef = useRef(null);

  useEffect(() => {
    setLocalRange(value ?? undefined);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const isActive = !!(value?.from && value?.to);

  function handleSelect(range) {
    setLocalRange(range);
    // react-day-picker v10 calls onSelect with from===to on the first click.
    // Only close and apply when the user has picked a genuine range (start ≠ end).
    if (range?.from && range?.to && !isSameDay(range.from, range.to)) {
      onChange({ from: range.from, to: range.to });
      setOpen(false);
    }
  }

  let label = "Personalizado";
  if (isActive) {
    label = `${format(value.from, "dd/MM")} – ${format(value.to, "dd/MM")}`;
  } else if (localRange?.from) {
    label = `${format(localRange.from, "dd/MM")} – ?`;
  }

  return (
    <>
      <style>{calendarStyles}</style>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-pressed={isActive}
          className={`seg-btn flex items-center gap-1.5 ${open && !isActive ? "!text-fg bg-ink/[0.06]" : ""}`}
        >
          <CalendarRange size={13} />
          <span>{label}</span>
        </button>

        {open && (
          <div className="popover absolute right-0 top-full mt-2 z-50">
            <div className="p-3 drp-root">
              <DayPicker
                mode="range"
                selected={localRange}
                onSelect={handleSelect}
                locale={ptBR}
                numberOfMonths={1}
              />
            </div>
            <div className="px-4 pb-3 text-xs text-fg-dim text-center">
              Clique na data inicial e depois na data final
            </div>
          </div>
        )}
      </div>
    </>
  );
}
