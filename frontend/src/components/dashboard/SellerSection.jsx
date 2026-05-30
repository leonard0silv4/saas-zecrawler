import { Store, Bell, Tag, Package, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StatCard, StatCardSkeleton } from "./StatCard";
import { SectionHeader, SectionWrap, Panel, RankList } from "./DashboardPrimitives";
import { DarkTooltip } from "./DarkTooltip";

export function SellerSection({ stats, loading }) {
  const cards = [
    {
      icon: Store, label: "Sellers Ativos",
      value: stats ? `${stats.active}/${stats.total}` : "—",
      iconBg: "bg-teal-50", iconColor: "text-teal-600",
    },
    {
      icon: Bell, label: "Mudanças Hoje",
      value: stats?.alertsToday,
      iconBg: "bg-amber-50", iconColor: "text-amber-600",
    },
    {
      icon: Tag, label: "Preços",
      value: stats?.priceChangesToday,
      sub: "alertas de preço hoje",
      iconBg: "bg-blue-50", iconColor: "text-blue-600",
    },
    {
      icon: Package, label: "Estoque",
      value: stats?.stockChangesToday,
      sub: "novos produtos hoje",
      iconBg: "bg-brand-50", iconColor: "text-brand-600",
    },
  ];

  return (
    <SectionWrap>
      <SectionHeader title="Monitor Sellers" to="/seller-monitor" linkLabel="Ver sellers" icon={Store} accent="bg-teal-500" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Mudanças nos Anúncios (15 dias)" className="lg:col-span-2">
            {(stats?.alertsByDay?.length ?? 0) === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                Sem dados de alterações ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={stats.alertsByDay}>
                  <defs>
                    <linearGradient id="gradMudancas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Mudanças"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    fill="url(#gradMudancas)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#14b8a6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>
          <Panel title="Sellers com mais mudanças" icon={Activity}>
            <RankList
              items={stats?.topSellers}
              emptyText="Nenhuma mudança nas últimas 24h"
              badgeColor="bg-teal-50 text-teal-700"
              nameKey="name"
              valueKey="alertsToday"
            />
          </Panel>
        </div>
      )}
    </SectionWrap>
  );
}
