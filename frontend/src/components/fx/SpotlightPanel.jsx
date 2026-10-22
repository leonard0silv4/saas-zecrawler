import { useRef } from "react";

/**
 * Painel de vidro com luz que segue o cursor (efeito "spotlight" estilo Aceternity).
 * Use em cards clicáveis / de destaque — não em toda superfície.
 */
export function SpotlightPanel({ as: Tag = "div", className = "", children, ...props }) {
  const ref = useRef(null);

  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <Tag
      ref={ref}
      onMouseMove={onMove}
      className={`group/spot glass relative overflow-hidden rounded-2xl ${className}`}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(360px circle at var(--mx, 50%) var(--my, 0%), rgb(var(--glow) / 0.10), transparent 60%)",
        }}
      />
      <div className="relative">{children}</div>
    </Tag>
  );
}
