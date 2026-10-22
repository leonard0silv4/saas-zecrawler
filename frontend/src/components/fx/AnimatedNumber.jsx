import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/**
 * Número que conta até `value` quando entra na tela.
 * `format` recebe o número e devolve string (ex.: formatBRL).
 */
export function AnimatedNumber({ value = 0, format = (n) => Math.round(n).toLocaleString("pt-BR"), duration = 1.1, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const last = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = Number(value) || 0;
    if (reduce || !inView) {
      el.textContent = format(target);
      if (reduce) last.current = target;
      return;
    }
    const controls = animate(last.current, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { el.textContent = format(v); },
    });
    last.current = target;
    return () => controls.stop();
  }, [value, inView, reduce, duration, format]);

  return <span ref={ref} className={`num ${className}`}>{format(Number(value) || 0)}</span>;
}
