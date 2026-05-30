import { Package, ExternalLink } from "lucide-react";
import { formatBRL } from "./formatBRL";

export function TopProductsTab({ topProducts, loading, topSort, setTopSort, topOnlyActive, setTopOnlyActive }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-gray-400">
          {topSort === "receita"
            ? "Ordenado por maior faturamento (R$) — um produto com preço maior pode superar outro com mais unidades"
            : "Ordenado por maior quantidade de unidades vendidas"}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTopOnlyActive((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              topOnlyActive
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${topOnlyActive ? "bg-white" : "bg-gray-300"}`} />
            Só disponíveis
          </button>
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
            {[
              { value: "receita",  label: "💰 Receita" },
              { value: "unidades", label: "📦 Unidades" },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setTopSort(s.value)}
                className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                  topSort === s.value ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : topProducts.length === 0 ? (
        <p className="text-sm text-gray-400">Sincronize os pedidos para ver o ranking.</p>
      ) : (
        <div className="space-y-2">
          {topProducts.map((p, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            return (
              <div
                key={p._id}
                className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                  i < 3 ? "bg-green-50/60 border border-green-100" : "bg-gray-50/60 hover:bg-gray-100/60"
                }`}
              >
                <div className="w-8 shrink-0 text-center">
                  {medal ? (
                    <span className="text-xl leading-none">{medal}</span>
                  ) : (
                    <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                  )}
                </div>

                {p.thumbnail ? (
                  <img
                    src={p.thumbnail}
                    alt={p.title}
                    className="w-12 h-12 rounded-xl object-contain border border-gray-100 bg-white shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shrink-0 flex items-center justify-center">
                    <Package size={18} className="text-gray-300" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate text-sm">{p.title || p._id}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.sku && (
                      <span className="text-xs text-gray-400 font-mono bg-white border border-gray-100 px-1.5 py-0.5 rounded">
                        {p.sku}
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.logistic_type === "fulfillment" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {p.logistic_type === "fulfillment" ? "Full" : "Normal"}
                    </span>
                    {(!p.thumbnail && !p.permalink) ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Removido</span>
                    ) : p.productStatus === "closed" ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Encerrado</span>
                    ) : p.productStatus === "paused" ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pausado</span>
                    ) : null}
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-base font-bold text-green-700">{formatBRL(p.receita)}</p>
                  <p className="text-xs text-gray-400">{p.unidades} un vendidas</p>
                </div>

                {p.permalink && (
                  <a
                    href={p.permalink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-green-700 transition-colors"
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
