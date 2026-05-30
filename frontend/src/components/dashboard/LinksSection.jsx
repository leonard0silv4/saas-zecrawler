import { Link2, TrendingUp, TrendingDown, Award } from "lucide-react";
import { StatCard, StatCardSkeleton } from "./StatCard";
import { SectionHeader, SectionWrap, Panel } from "./DashboardPrimitives";
import { WinLossBar } from "./WinLossBar";

export function LinksSection({ stats, loading }) {
  const cards = [
    {
      icon: Link2, label: "Total de Links",
      value: stats?.total,
      iconBg: "bg-blue-50", iconColor: "text-blue-600",
    },
    {
      icon: TrendingUp, label: "Links Ganhando",
      value: stats?.winning,
      sub: stats?.total ? `${((stats.winning / stats.total) * 100).toFixed(1)}% do total` : null,
      iconBg: "bg-green-50", iconColor: "text-green-600",
      trend: { value: "Ganhando", direction: "up" },
    },
    {
      icon: TrendingDown, label: "Links Perdendo",
      value: stats?.losing,
      sub: stats?.total ? `${((stats.losing / stats.total) * 100).toFixed(1)}% do total` : null,
      iconBg: "bg-red-50", iconColor: "text-red-600",
    },
    {
      icon: Award, label: "Competitividade Hoje",
      value: stats?.competitividade != null ? `${stats.competitividade.toFixed(1)}%` : "—",
      sub: "ganhando vs perdendo",
      iconBg: "bg-brand-50", iconColor: "text-brand-600",
    },
  ];

  return (
    <SectionWrap>
      <SectionHeader title="Links Monitorados" to="/links" icon={Link2} accent="bg-blue-500" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      {!loading && (
        <Panel title="Competitividade: Ganhando vs Perdendo">
          {stats?.total ? (
            <WinLossBar winning={stats.winning} losing={stats.losing} total={stats.total} />
          ) : (
            <div className="flex h-20 items-center justify-center text-sm text-gray-400">
              Nenhum link cadastrado ainda
            </div>
          )}
        </Panel>
      )}
    </SectionWrap>
  );
}
