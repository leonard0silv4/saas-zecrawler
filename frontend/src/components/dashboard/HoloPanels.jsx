import { Link2, MessageSquare, TrendingDown, TrendingUp } from "lucide-react";
import { RingGauge, Sparkline, AnimatedNumber } from "../fx";
import { chartColors } from "../../lib/chartTheme";

/**
 * Conteúdo dos painéis do hero do Dashboard (dados reais do /dashboard/stats).
 * Usado tanto pela cena 3D (HoloScene3D) quanto pelo fallback 2D (HoloDeck2D).
 */
export function derivePanelData(stats) {
  const messages = stats?.messages;
  return {
    competitividade: stats?.links?.competitividade ?? 0,
    links: stats?.links,
    messages,
    hourly: messages?.questionsByHour ?? [],
  };
}

export function CompetitividadePanel({ data, loading }) {
  return (
    <>
      <p className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Link2 size={12} className="text-glow" /> Competitividade
      </p>
      <div className="mt-2 flex items-center justify-center">
        <RingGauge value={loading ? 0 : data.competitividade} size={86} color={chartColors.neon}>
          <span className="num text-lg font-semibold text-fg">
            {loading ? "—" : `${data.competitividade.toFixed(0)}%`}
          </span>
        </RingGauge>
      </div>
    </>
  );
}

export function PerguntasPanel({ data, loading }) {
  const { messages, hourly } = data;
  return (
    <>
      <p className="flex items-center gap-1.5 text-xs text-fg-muted">
        <MessageSquare size={12} className="text-glow" /> Perguntas por horário
      </p>
      <p className="mt-2 num text-3xl font-semibold text-fg leading-none">
        {loading ? "—" : <AnimatedNumber value={messages?.total ?? 0} />}
      </p>
      <p className="mt-1 text-[11px] text-fg-dim">
        {messages?.responseRate != null ? `${messages.responseRate.toFixed(0)}% respondidas` : "sem dados ainda"}
      </p>
      <Sparkline data={hourly} variant="bars" color={chartColors.brandLight} height={56} className="mt-3" />
    </>
  );
}

export function LinksPanel({ data, loading }) {
  const total = data.links?.total ?? 0;
  const winning = data.links?.winning ?? 0;
  const losing = data.links?.losing ?? 0;
  const winPct = total ? (winning / total) * 100 : 0;
  const losePct = total ? (losing / total) * 100 : 0;
  return (
    <>
      <p className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Link2 size={12} className="text-glow" /> Links monitorados
      </p>
      <p className="mt-2 num text-2xl font-semibold text-fg leading-none">
        {loading ? "—" : <AnimatedNumber value={total} />}
      </p>
      <div className="mt-3 flex h-1.5 gap-0.5 rounded-full bg-ink/10">
        {winPct > 0 && (
          <span className="rounded-full bg-neon shadow-[0_0_8px_rgb(var(--neon)/0.8)]" style={{ width: `${winPct}%` }} />
        )}
        <span className="flex-1" />
        {losePct > 0 && (
          <span className="rounded-full bg-danger shadow-[0_0_8px_rgb(var(--danger)/0.8)]" style={{ width: `${losePct}%` }} />
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1 text-neon">
          <TrendingUp size={11} /> <span className="num">{loading ? "—" : winning}</span> ganhando
        </span>
        <span className="inline-flex items-center gap-1 text-danger">
          <TrendingDown size={11} /> <span className="num">{loading ? "—" : losing}</span>
        </span>
      </div>
    </>
  );
}
