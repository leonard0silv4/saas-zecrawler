import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, TrendingUp, Clock, Zap, Users, Lock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StatCard, StatCardSkeleton } from "./StatCard";
import { SectionHeader, SectionWrap, Panel, RankList } from "./DashboardPrimitives";
import { NeonTooltip, ChartGlowDefs } from "../charts";
import { chartAxis, chartGrid, chartTooltipProps, chartColors } from "../../lib/chartTheme";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import { Button, EmptyState } from "../ui";

export function MensagensMlSection({ stats, loading }) {
  const { canAccess } = useAuth();
  const hasAccess = canAccess("meliMessages");
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (!hasAccess) return;
    api.get("/meli/messages/usage").then((r) => setUsage(r.data)).catch(() => {});
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <SectionWrap>
        <SectionHeader title="Mensagens ML" to="/meli/messages" linkLabel="Abrir mensagens" icon={MessageSquare} />
        <div className="glass rounded-2xl">
          <EmptyState
            icon={Lock}
            title="Disponível a partir do plano Starter"
            description="Gerencie perguntas do Mercado Livre com análise de desempenho da equipe."
            action={<Link to="/plans"><Button size="sm">Ver planos</Button></Link>}
          />
        </div>
      </SectionWrap>
    );
  }

  const cards = [
    {
      icon: MessageSquare, label: "Total de Perguntas",
      value: stats?.total,
      tone: "brand",
    },
    {
      icon: TrendingUp, label: "Taxa de Resposta",
      value: stats?.responseRate != null ? `${stats.responseRate.toFixed(1)}%` : "—",
      sub: `${stats?.answered ?? 0} de ${stats?.total ?? 0} respondidas`,
      tone: "neon",
      trend: { value: "Ótimo", direction: "up" },
    },
    {
      icon: Clock, label: "Tempo Médio",
      value: stats?.avgResponseMinutes != null ? `${stats.avgResponseMinutes}min` : "—",
      sub: "últimos 7 dias",
      tone: "warn",
    },
    {
      icon: Zap, label: "Pico de Mensagens",
      value: stats?.peakHour != null ? `${stats.peakHour}h` : "—",
      sub: "hora com mais perguntas",
      tone: "glow",
    },
  ];

  const hourlyData = stats?.questionsByHour
    ? stats.questionsByHour.map((count, h) => ({ hora: `${h}h`, Perguntas: count }))
    : [];

  return (
    <SectionWrap>
      <SectionHeader title="Mensagens ML" to="/meli/messages" linkLabel="Abrir mensagens" icon={MessageSquare} />
      {usage && (
        <p className="text-xs text-fg-muted -mt-2">
          {usage.max == null
            ? "Mensagens respondidas este mês: ilimitado"
            : `Mensagens respondidas este mês: ${usage.current} de ${usage.max}`}
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Perguntas por Horário" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData} barCategoryGap="22%">
                {ChartGlowDefs()}
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="hora" {...chartAxis} tick={{ ...chartAxis.tick, fontSize: 10 }} interval={2} />
                <YAxis {...chartAxis} tick={{ ...chartAxis.tick, fontSize: 10 }} width={28} allowDecimals={false} />
                <Tooltip {...chartTooltipProps} cursor={{ fill: "rgb(var(--glow) / 0.06)" }} content={<NeonTooltip />} />
                <Bar dataKey="Perguntas" fill={chartColors.brand} radius={[4, 4, 0, 0]} maxBarSize={20} filter="url(#neon-glow)" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Top Respondedores" icon={Users}>
            <RankList
              items={stats?.topRespondedores}
              emptyText="Nenhum dado ainda. Os respondedores aparecerão aqui conforme as mensagens forem respondidas."
              nameKey="name"
              valueKey="answered"
            />
          </Panel>
        </div>
      )}
    </SectionWrap>
  );
}
