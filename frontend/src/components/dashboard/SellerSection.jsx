import { Store, Bell, Tag, Package, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StatCard, StatCardSkeleton } from "./StatCard";
import { SectionHeader, SectionWrap, Panel, RankList } from "./DashboardPrimitives";
import { NeonTooltip, ChartGlowDefs } from "../charts";
import { chartAxis, chartGrid, chartTooltipProps, chartColors, neonActiveDot } from "../../lib/chartTheme";

export function SellerSection({ stats, loading }) {
  const cards = [
    {
      icon: Store, label: "Sellers Ativos",
      value: stats ? `${stats.active}/${stats.total}` : "—",
      tone: "neon",
    },
    {
      icon: Bell, label: "Mudanças Hoje",
      value: stats?.alertsToday,
      tone: "warn",
    },
    {
      icon: Tag, label: "Preços",
      value: stats?.priceChangesToday,
      sub: "alertas de preço hoje",
      tone: "brand",
    },
    {
      icon: Package, label: "Estoque",
      value: stats?.stockChangesToday,
      sub: "novos produtos hoje",
      tone: "glow",
    },
  ];

  return (
    <SectionWrap>
      <SectionHeader title="Monitor Sellers" to="/seller-monitor" linkLabel="Ver sellers" icon={Store} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Mudanças nos Anúncios (15 dias)" className="lg:col-span-2">
            {(stats?.alertsByDay?.length ?? 0) === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-fg-dim">
                Sem dados de alterações ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={stats.alertsByDay}>
                  {ChartGlowDefs()}
                  <CartesianGrid {...chartGrid} />
                  <XAxis dataKey="date" {...chartAxis} tick={{ ...chartAxis.tick, fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis {...chartAxis} tick={{ ...chartAxis.tick, fontSize: 10 }} width={28} allowDecimals={false} />
                  <Tooltip {...chartTooltipProps} content={<NeonTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Mudanças"
                    stroke={chartColors.neon}
                    strokeWidth={2}
                    fill="url(#area-neon)"
                    filter="url(#neon-glow)"
                    dot={false}
                    activeDot={neonActiveDot(chartColors.neon)}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>
          <Panel title="Sellers com mais mudanças" icon={Activity}>
            <RankList
              items={stats?.topSellers}
              emptyText="Nenhuma mudança nas últimas 24h"
              nameKey="name"
              valueKey="alertsToday"
            />
          </Panel>
        </div>
      )}
    </SectionWrap>
  );
}
