import { Link } from "react-router-dom";
import { BarChart2, Award, TrendingDown, RefreshCw, AlertTriangle } from "lucide-react";
import { StatCard, StatCardSkeleton } from "./StatCard";
import { SectionHeader, SectionWrap, Panel } from "./DashboardPrimitives";
import { WinLossBar } from "./WinLossBar";
import { Button, EmptyState } from "../ui";

export function PriceAnalyzeSection({ xmlStats, loading, noStores }) {
  const cards = [
    {
      icon: BarChart2, label: "Total Catálogos",
      value: xmlStats?.total,
      tone: "brand",
    },
    {
      icon: Award, label: "Taxa Vitória",
      value: xmlStats?.taxaVitoria != null ? `${xmlStats.taxaVitoria.toFixed(1)}%` : "—",
      sub: `${xmlStats?.winning ?? 0} grupos ganhando`,
      tone: "neon",
      trend: { value: "Vitória", direction: "up" },
    },
    {
      icon: TrendingDown, label: "Dif. Média",
      value: xmlStats?.difMedia != null
        ? `${xmlStats.difMedia > 0 ? "+" : ""}${xmlStats.difMedia.toFixed(1)}%`
        : "—",
      sub: "vs menor preço concorrente",
      tone: "warn",
      trend: xmlStats?.difMedia != null
        ? { value: `${Math.abs(xmlStats.difMedia).toFixed(1)}%`, direction: xmlStats.difMedia <= 0 ? "down" : "up" }
        : undefined,
    },
    {
      icon: RefreshCw, label: "Reprecificações",
      value: xmlStats?.reprecificacoes,
      sub: "sugestões de ajuste",
      tone: "warn",
    },
  ];

  return (
    <SectionWrap>
      <SectionHeader title="Análise de Concorrência" to="/price-analyze" linkLabel="Ver análise" icon={BarChart2} />
      {noStores && !loading && (
        <div className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2.5 text-xs text-fg/90">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />
          <span>
            Suas lojas não estão configuradas — os dados de vitória/derrota podem estar incorretos.{" "}
            <Link to="/settings" className="font-semibold text-warn underline hover:text-fg">
              Ir para Configurações
            </Link>
          </span>
        </div>
      )}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : xmlStats === null || xmlStats === undefined ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={BarChart2}
            title="Nenhuma análise gerada ainda"
            description="Gere a análise para comparar seus preços com os concorrentes por SKU."
            action={<Link to="/price-analyze"><Button size="sm" variant="secondary">Gerar análise de preços</Button></Link>}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((c) => <StatCard key={c.label} {...c} />)}
          </div>
          <Panel title="Catálogos: Ganhando vs Perdendo">
            <WinLossBar
              winning={xmlStats.winning}
              losing={xmlStats.losing}
              total={xmlStats.total}
            />
          </Panel>
        </>
      )}
    </SectionWrap>
  );
}
