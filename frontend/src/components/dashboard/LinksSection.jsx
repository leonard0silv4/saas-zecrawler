import { Link2, TrendingUp, TrendingDown, Award } from "lucide-react";
import { StatCard, StatCardSkeleton } from "./StatCard";
import { SectionHeader, SectionWrap, Panel } from "./DashboardPrimitives";
import { WinLossBar } from "./WinLossBar";

export function LinksSection({ stats, loading }) {
  const cards = [
    {
      icon: Link2, label: "Total de Links",
      value: stats?.total,
      tone: "brand",
    },
    {
      icon: TrendingUp, label: "Links Ganhando",
      value: stats?.winning,
      sub: stats?.total ? `${((stats.winning / stats.total) * 100).toFixed(1)}% do total` : null,
      tone: "neon",
      trend: { value: "Ganhando", direction: "up" },
    },
    {
      icon: TrendingDown, label: "Links Perdendo",
      value: stats?.losing,
      sub: stats?.total ? `${((stats.losing / stats.total) * 100).toFixed(1)}% do total` : null,
      tone: "danger",
    },
    {
      icon: Award, label: "Competitividade Hoje",
      value: stats?.competitividade != null ? `${stats.competitividade.toFixed(1)}%` : "—",
      sub: "ganhando vs perdendo",
      tone: "glow",
    },
  ];

  return (
    <SectionWrap>
      <SectionHeader title="Links Monitorados" to="/links" icon={Link2} />
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
            <div className="flex h-20 items-center justify-center text-sm text-fg-dim">
              Nenhum link cadastrado ainda
            </div>
          )}
        </Panel>
      )}
    </SectionWrap>
  );
}
