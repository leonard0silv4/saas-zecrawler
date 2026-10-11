import { Package, ExternalLink, DollarSign } from "lucide-react";
import { formatBRL } from "./formatBRL";

export function TopProductsTab({ topProducts, loading, topSort, setTopSort, topOnlyActive, setTopOnlyActive }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-fg-dim">
          {topSort === "receita"
            ? "Ordenado por maior faturamento (R$) — um produto com preço maior pode superar outro com mais unidades"
            : "Ordenado por maior quantidade de unidades vendidas"}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTopOnlyActive((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              topOnlyActive
                ? "bg-brandSolid-500/20 text-fg border-brandSolid-400/50 shadow-[0_0_14px_-6px_rgb(30_123_255/0.9)]"
                : "bg-surface-2 text-fg-muted border-line/15 hover:bg-ink/[0.03]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${topOnlyActive ? "bg-surface-2" : "bg-ink/15"}`} />
            Só disponíveis
          </button>
          <div className="seg !p-0.5 text-xs">
            {[
              { value: "receita",  label: "Receita",  icon: DollarSign },
              { value: "unidades", label: "Unidades", icon: Package },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.value}
                  onClick={() => setTopSort(s.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-semibold ${
                    topSort === s.value ? "seg-btn-active" : "text-fg-muted hover:text-fg/90"
                  }`}
                >
                  <Icon size={12} className="shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-fg-dim">Carregando…</p>
      ) : topProducts.length === 0 ? (
        <p className="text-sm text-fg-dim">Sincronize os pedidos para ver o ranking.</p>
      ) : (
        <div className="space-y-2">
          {topProducts.map((p, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            return (
              <div
                key={p._id}
                className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                  i < 3 ? "bg-neon/10 border border-neon/25" : "bg-ink/[0.02] hover:bg-ink/[0.04]"
                }`}
              >
                <div className="w-8 shrink-0 text-center">
                  {medal ? (
                    <span className="text-xl leading-none">{medal}</span>
                  ) : (
                    <span className="text-xs font-bold text-fg-dim">{i + 1}</span>
                  )}
                </div>

                {p.thumbnail ? (
                  <img
                    src={p.thumbnail}
                    alt={p.title}
                    className="w-12 h-12 rounded-xl object-contain border border-line/10 bg-surface-2 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-surface-2 border border-line/10 shrink-0 flex items-center justify-center">
                    <Package size={18} className="text-fg-dim/60" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-fg truncate text-sm">{p.title || p._id}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.sku && (
                      <span className="text-xs text-fg-dim font-mono bg-surface-2 border border-line/10 px-1.5 py-0.5 rounded">
                        {p.sku}
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.logistic_type === "fulfillment" ? "bg-neon/15 text-neon" : "bg-ink/[0.06] text-fg-muted"
                    }`}>
                      {p.logistic_type === "fulfillment" ? "Full" : "Normal"}
                    </span>
                    {(!p.thumbnail && !p.permalink) ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-ink/[0.06] text-fg-dim">Removido</span>
                    ) : p.productStatus === "closed" ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-danger/15 text-danger">Encerrado</span>
                    ) : p.productStatus === "paused" ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warn/15 text-warn">Pausado</span>
                    ) : null}
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-base font-bold text-neon">{formatBRL(p.receita)}</p>
                  <p className="text-xs text-fg-dim">{p.unidades} un vendidas</p>
                </div>

                {p.permalink && (
                  <a
                    href={p.permalink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-surface-2 text-fg-dim hover:text-neon transition-colors"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
