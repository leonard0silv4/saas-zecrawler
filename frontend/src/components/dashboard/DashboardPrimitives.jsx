import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function SectionHeader({ title, to, linkLabel = "Ver todos", icon: Icon }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon size={17} className="text-glow drop-shadow-[0_0_6px_rgb(var(--glow)/0.7)]" />}
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
      </div>
      <Link
        to={to}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium text-brandSolid-300 transition-colors hover:bg-brandSolid-500/10 hover:text-fg"
      >
        {linkLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

/** Seção sem caixa externa — só espaço e uma linha de luz no topo. */
export function SectionWrap({ children }) {
  return (
    <section className="relative space-y-4 pt-6">
      <div aria-hidden className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-line/20 to-transparent" />
      {children}
    </section>
  );
}

export function Panel({ title, icon: Icon, children, className }) {
  return (
    <div className={`glass rounded-2xl p-5${className ? ` ${className}` : ""}`}>
      <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-fg/90">
        {Icon && <Icon size={15} className="text-fg-dim" />}
        {title}
      </p>
      {children}
    </div>
  );
}

export function RankList({ items, emptyText, nameKey = "name", valueKey }) {
  if (!items?.length) {
    return <p className="text-xs text-fg-dim">{emptyText}</p>;
  }
  return (
    <ol className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-ink/[0.04]">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold num ${
              i === 0 ? "border-glow/50 text-glow shadow-[0_0_10px_-2px_rgb(var(--glow)/0.8)]" : "border-line/20 text-fg-muted"
            }`}>
              {i + 1}
            </span>
            <span className="truncate text-fg/90">{item[nameKey] || "—"}</span>
          </span>
          <span className="ml-2 shrink-0 num font-semibold text-fg-muted">{item[valueKey]}</span>
        </li>
      ))}
    </ol>
  );
}
