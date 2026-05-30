import { Link } from "react-router-dom";
import { BarChart2, Award, TrendingDown, RefreshCw, AlertTriangle } from "lucide-react";
import { StatCard, StatCardSkeleton } from "./StatCard";
import { SectionHeader, SectionWrap, Panel } from "./DashboardPrimitives";
import { WinLossBar } from "./WinLossBar";

export function PriceAnalyzeSection({ xmlStats, loading, noStores }) {
  const cards = [
    {
      icon: BarChart2, label: "Total Catálogos",
      value: xmlStats?.total,
      iconBg: "bg-blue-50", iconColor: "text-blue-600",
    },
    {
      icon: Award, label: "Taxa Vitória",
      value: xmlStats?.taxaVitoria != null ? `${xmlStats.taxaVitoria.toFixed(1)}%` : "—",
      sub: `${xmlStats?.winning ?? 0} grupos ganhando`,
      iconBg: "bg-green-50", iconColor: "text-green-600",
      trend: { value: "Vitória", direction: "up" },
    },
    {
      icon: TrendingDown, label: "Dif. Média",
      value: xmlStats?.difMedia != null
        ? `${xmlStats.difMedia > 0 ? "+" : ""}${xmlStats.difMedia.toFixed(1)}%`
        : "—",
      sub: "vs menor preço concorrente",
      iconBg: "bg-amber-50", iconColor: "text-amber-600",
      trend: xmlStats?.difMedia != null
        ? { value: `${Math.abs(xmlStats.difMedia).toFixed(1)}%`, direction: xmlStats.difMedia <= 0 ? "down" : "up" }
        : undefined,
    },
    {
      icon: RefreshCw, label: "Reprecificações",
      value: xmlStats?.reprecificacoes,
      sub: "sugestões de ajuste",
      iconBg: "bg-orange-50", iconColor: "text-orange-600",
    },
  ];

  return (
    <SectionWrap>
      <SectionHeader title="Análise de Concorrência" to="/price-analyze" linkLabel="Ver análise" icon={BarChart2} accent="bg-sky-500" />
      {noStores && !loading && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
          <span>
            Suas lojas não estão configuradas — os dados de vitória/derrota podem estar incorretos.{" "}
            <Link to="/settings" className="font-semibold underline hover:text-amber-900">
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
        <div className="py-10 text-center text-gray-400">
          <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma análise gerada ainda.</p>
          <Link to="/price-analyze" className="text-sm text-brand-600 hover:underline">
            Gerar análise de preços
          </Link>
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
              winColor="#6366f1"
              loseColor="#f59e0b"
            />
          </Panel>
        </>
      )}
    </SectionWrap>
  );
}
