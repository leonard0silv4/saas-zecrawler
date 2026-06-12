import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange } from "lucide-react";
import "react-day-picker/style.css";

const calendarStyles = `
  .drp-root {
    --rdp-accent-color: #16a34a;
    --rdp-accent-background-color: #dcfce7;
    --rdp-selected-color: #ffffff;
    --rdp-today-color: #16a34a;
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
    background-color: #dcfce7;
    color: #15803d;
  }
  .drp-root .rdp-caption_label {
    font-size: 14px;
    font-weight: 600;
  }
  .drp-root .rdp-weekday {
    font-size: 11px;
    font-weight: 600;
    color: #9ca3af;
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
    if (range?.from && range?.to) {
      onChange({ from: range.from, to: range.to });
      setOpen(false);
    }
  }

  const label = isActive
    ? `${format(value.from, "dd/MM")} – ${format(value.to, "dd/MM")}`
    : "Personalizado";

  return (
    <>
      <style>{calendarStyles}</style>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1.5 text-sm ${
            isActive
              ? "bg-white text-green-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <CalendarRange size={13} />
          <span>{label}</span>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-3 drp-root">
              <DayPicker
                mode="range"
                selected={localRange}
                onSelect={handleSelect}
                locale={ptBR}
                numberOfMonths={1}
              />
            </div>
            <div className="px-4 pb-3 text-xs text-gray-400 text-center">
              Selecione início e fim do período
            </div>
          </div>
        )}
      </div>
    </>
  );
}
