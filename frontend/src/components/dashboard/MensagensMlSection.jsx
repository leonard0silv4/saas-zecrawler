import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, TrendingUp, Clock, Zap, Users, Lock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StatCard, StatCardSkeleton } from "./StatCard";
import { SectionHeader, SectionWrap, Panel, RankList } from "./DashboardPrimitives";
import { DarkTooltip } from "./DarkTooltip";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";

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
        <SectionHeader title="Mensagens ML" to="/meli/messages" linkLabel="Abrir mensagens" icon={MessageSquare} accent="bg-amber-500" />
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <Lock size={22} className="text-amber-500" />
          </div>
          <p className="text-gray-600 font-medium">Disponível a partir do plano Starter</p>
          <p className="text-sm text-gray-400 text-center max-w-sm">
            Gerencie perguntas do Mercado Livre com análise de desempenho da equipe
          </p>
          <Link
            to="/plans"
            className="mt-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
          >
            Ver planos
          </Link>
        </div>
      </SectionWrap>
    );
  }

  const cards = [
    {
      icon: MessageSquare, label: "Total de Perguntas",
      value: stats?.total,
      iconBg: "bg-blue-50", iconColor: "text-blue-600",
    },
    {
      icon: TrendingUp, label: "Taxa de Resposta",
      value: stats?.responseRate != null ? `${stats.responseRate.toFixed(1)}%` : "—",
      sub: `${stats?.answered ?? 0} de ${stats?.total ?? 0} respondidas`,
      iconBg: "bg-green-50", iconColor: "text-green-600",
      trend: { value: "Ótimo", direction: "up" },
    },
    {
      icon: Clock, label: "Tempo Médio",
      value: stats?.avgResponseMinutes != null ? `${stats.avgResponseMinutes}min` : "—",
      sub: "últimos 7 dias",
      iconBg: "bg-amber-50", iconColor: "text-amber-600",
    },
    {
      icon: Zap, label: "Pico de Mensagens",
      value: stats?.peakHour != null ? `${stats.peakHour}h` : "—",
      sub: "hora com mais perguntas",
      iconBg: "bg-brand-50", iconColor: "text-brand-600",
    },
  ];

  const hourlyData = stats?.questionsByHour
    ? stats.questionsByHour.map((count, h) => ({ hora: `${h}h`, Perguntas: count }))
    : [];

  return (
    <SectionWrap>
      <SectionHeader title="Mensagens ML" to="/meli/messages" linkLabel="Abrir mensagens" icon={MessageSquare} accent="bg-amber-500" />
      {usage && (
        <p className="text-xs text-gray-500 -mt-2">
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
              <BarChart data={hourlyData} barCategoryGap="20%">
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="hora"
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<DarkTooltip />}
                  cursor={{ fill: "rgba(0,112,199,0.06)" }}
                />
                <Bar dataKey="Perguntas" fill="#0070c7" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Top Respondedores" icon={Users}>
            <RankList
              items={stats?.topRespondedores}
              emptyText="Nenhum dado ainda. Os respondedores aparecerão aqui conforme as mensagens forem respondidas."
              badgeColor="bg-brand-50 text-brand-700"
              nameKey="name"
              valueKey="answered"
            />
          </Panel>
        </div>
      )}
    </SectionWrap>
  );
}
