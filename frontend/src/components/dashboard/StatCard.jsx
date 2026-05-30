import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function StatCard({ icon: Icon, label, value, sub, iconColor = "text-gray-600", iconBg = "bg-gray-100", trend }) {
  return (
    <div className="group relative rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
            trend.direction === "up" ? "bg-green-50 text-green-700" :
            trend.direction === "down" ? "bg-red-50 text-red-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {trend.direction === "up" && <ArrowUpRight size={12} />}
            {trend.direction === "down" && <ArrowDownRight size={12} />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value ?? "—"}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export function StatCardSkeleton() {
  return <div className="h-[124px] animate-pulse rounded-2xl border border-gray-200/70 bg-gray-100/70" />;
}
