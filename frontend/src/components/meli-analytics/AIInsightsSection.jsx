import { useState } from "react";
import {
  Sparkles, TrendingUp, Package, AlertTriangle,
  X, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TYPE_CONFIG = {
  growth: {
    Icon: TrendingUp,
    iconColor: "text-neon",
    iconBg: "bg-neon/15",
    cardBorder: "border-l-emerald-400",
    badgeBg: "bg-neon/10 border-neon/25 text-neon",
  },
  promotion: {
    Icon: Package,
    iconColor: "text-brandSolid-300",
    iconBg: "bg-brandSolid-500/15",
    cardBorder: "border-l-blue-400",
    badgeBg: "bg-brandSolid-500/10 border-brandSolid-400/30 text-brandSolid-300",
  },
  alert: {
    Icon: AlertTriangle,
    iconColor: "text-warn",
    iconBg: "bg-warn/15",
    cardBorder: "border-l-amber-400",
    badgeBg: "bg-warn/10 border-warn/30 text-warn",
  },
};

const PRIORITY_BADGE = {
  high:   "bg-danger/10 text-danger border border-danger/30",
  medium: "bg-warn/10 text-warn border border-warn/30",
  low:    "bg-ink/[0.06] text-fg-muted border border-line/15",
};

const PRIORITY_LABEL = { high: "Alta", medium: "Média", low: "Baixa" };

function detectType(text) {
  const lower = text.toLowerCase();
  if (/ruptura|atenção|urgente|crítico|falta de estoque/.test(lower)) return "alert";
  if (/promoç|campanha|bundle|desconto|oferta/.test(lower)) return "promotion";
  return "growth";
}

function parseInsights(text) {
  if (!text?.trim()) return [];

  // Try numbered list: "1. ...", "1) ..."
  const numberedSplit = text.split(/\n(?=\s*\d+\s*[.)]\s)/).map((b) => b.trim()).filter(Boolean);
  let blocks = numberedSplit.length > 1 ? numberedSplit : text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  if (blocks.length === 0) blocks = [text];

  return blocks.map((block, index) => {
    // Strip leading number prefix "1. " or "1) "
    const cleaned = block.replace(/^\s*\d+\s*[.)]\s*/, "");
    const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);

    let rawTitle = lines[0] || "";
    // Strip markdown bold/headers
    rawTitle = rawTitle.replace(/\*\*/g, "").replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim();

    const title = rawTitle;
    const description = lines.length > 1
      ? lines.slice(1).join(" ").replace(/\*\*/g, "").trim()
      : "";

    const type = detectType(block);
    const priority = type === "alert" ? "high" : type === "promotion" ? "medium" : "high";

    return { id: String(index), type, title, description, priority };
  });
}

export function AIInsightsSection({ aiAnalysis, aiGeneratedAt, onDismiss }) {
  const [dismissed, setDismissed] = useState(new Set());

  const insights = parseInsights(aiAnalysis);
  const visible = insights.filter((ins) => !dismissed.has(ins.id));

  if (visible.length === 0) return null;

  const formattedTime = aiGeneratedAt
    ? format(new Date(aiGeneratedAt), "HH:mm 'de' dd/MM/yyyy", { locale: ptBR })
    : null;

  const handleDismissOne = (id) =>
    setDismissed((prev) => new Set([...prev, id]));

  return (
    <div className="w-full glass glow-top rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-line/10 bg-gradient-to-r from-brandSolid-500/15 via-glow/[0.04] to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Sparkles icon container */}
            <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-brandSolid-500/10 border border-brandSolid-400/30 ring-1 ring-brandSolid-400/25">
              <Sparkles size={16} className="text-brandSolid-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-fg">Insights da IA</span>
                {/* Live badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-brandSolid-500/10 text-brandSolid-300 border border-brandSolid-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-brandSolid-500 animate-pulse" />
                  Ao vivo
                </span>
              </div>
              {/* {formattedTime && (
                <p className="text-xs text-fg-dim mt-0.5 flex items-center gap-1">
                  <Clock size={11} />
                  Gerado em {formattedTime}
                </p>
              )} */}
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-fg-dim hover:text-fg-muted hover:bg-ink/[0.06] transition-colors"
            title="Fechar"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Insight cards */}
      <div className="p-4 flex flex-col gap-3">
        {visible.map((insight) => {
          const cfg = TYPE_CONFIG[insight.type];
          const { Icon } = cfg;

          return (
            <div
              key={insight.id}
              className={`group relative flex items-start gap-4 p-4 rounded-xl border border-l-4 ${cfg.cardBorder} border-line/15 bg-ink/[0.03] hover:bg-surface-2 hover:border-line/25 hover:shadow-sm transition-all duration-200`}
            >
              {/* Type icon */}
              <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${cfg.iconBg}`}>
                <Icon size={18} className={cfg.iconColor} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-fg text-sm leading-snug">{insight.title}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full border ${PRIORITY_BADGE[insight.priority]}`}>
                    {PRIORITY_LABEL[insight.priority]}
                  </span>
                </div>
                {insight.description && (
                  <p className="text-sm text-fg-muted leading-relaxed">{insight.description}</p>
                )}
              </div>

              {/* Dismiss button — visible on hover */}
              <button
                onClick={() => handleDismissOne(insight.id)}
                className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 text-fg-dim hover:text-neon hover:bg-neon/10 transition-all duration-150"
                title="Marcar como visto"
              >
                <CheckCircle2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-line/10 bg-ink/[0.02]">
        <p className="text-xs text-fg-dim">
          {visible.length} {visible.length === 1 ? "recomendação ativa" : "recomendações ativas"}
        </p>
      </div>
    </div>
  );
}
