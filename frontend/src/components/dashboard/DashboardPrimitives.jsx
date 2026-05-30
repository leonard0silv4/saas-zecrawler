import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function SectionHeader({ title, to, linkLabel = "Ver todos", icon: Icon, accent = "bg-brand-500" }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-white ${accent}`}>
            <Icon size={15} />
          </span>
        ) : (
          <span className={`h-5 w-1 rounded-full ${accent}`} />
        )}
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      <Link
        to={to}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
      >
        {linkLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

export function SectionWrap({ children }) {
  return (
    <section className="space-y-4 rounded-3xl border border-gray-200/60 bg-gray-50/60 p-5">
      {children}
    </section>
  );
}

export function Panel({ title, icon: Icon, children, className }) {
  return (
    <div className={`rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm${className ? ` ${className}` : ""}`}>
      <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        {Icon && <Icon size={15} className="text-gray-400" />}
        {title}
      </p>
      {children}
    </div>
  );
}

export function RankList({ items, emptyText, badgeColor = "bg-brand-50 text-brand-700", nameKey = "name", valueKey }) {
  if (!items?.length) {
    return <p className="text-xs text-gray-400">{emptyText}</p>;
  }
  return (
    <ol className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-gray-50">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeColor}`}>
              {i + 1}
            </span>
            <span className="truncate font-medium text-gray-700">{item[nameKey] || "—"}</span>
          </span>
          <span className="ml-2 shrink-0 font-semibold tabular-nums text-gray-500">{item[valueKey]}</span>
        </li>
      ))}
    </ol>
  );
}
