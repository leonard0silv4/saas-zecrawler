import { TrendingUp, TrendingDown } from "lucide-react";
import { AnimatedNumber } from "../fx/AnimatedNumber";

/**
 * Indicador numérico. `value` numérico anima; `display` (string) mostra texto pronto.
 * `delta` em % — positivo fica verde neon, negativo vermelho.
 */
export function Kpi({ label, value, display, format, delta, hint, icon: Icon, className = "" }) {
  const up = delta != null && delta >= 0;
  return (
    <div className={`glass glow-top rounded-2xl p-4 md:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-fg-muted">{label}</p>
        {Icon && <Icon size={16} className="text-glow/80" />}
      </div>
      <p className="mt-2 text-2xl md:text-[1.75rem] font-semibold text-fg leading-none num">
        {display != null ? display : <AnimatedNumber value={value} format={format} />}
      </p>
      {(delta != null || hint) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {delta != null && (
            <span className={`inline-flex items-center gap-1 font-medium ${up ? "text-neon" : "text-danger"}`}>
              {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {up ? "+" : ""}{delta.toFixed(1)}%
            </span>
          )}
          {hint && <span className="text-fg-dim">{hint}</span>}
        </div>
      )}
    </div>
  );
}
