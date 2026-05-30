import { useState } from "react";
import { createPortal } from "react-dom";
import { Brain, HelpCircle, TrendingDown, TrendingUp, Minus, X } from "lucide-react";

export function AISection({ aiData, scenario, setScenario, winableSkus, setWinableSkus }) {
  const [showHelp, setShowHelp] = useState(false);
  const losingCount = aiData?.losingCount || 0;
  const totalCount  = aiData?.totalCount  || 0;
  const medianPrice = aiData?.losingMedianPrice || 0;
  const salesPerSku10Days = scenario === "conservative" ? 0.25 : 0.5;

  const project = (days) => medianPrice * winableSkus * salesPerSku10Days * (days / 7);
  const maxProjection = project(20);

  if (!aiData || totalCount === 0) return null;

  return (
    <div className="mb-4 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl p-4 shadow-sm hidden">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={15} className="text-brand-600" />
        <span className="text-sm font-semibold text-gray-700">Inteligência de Receita</span>
        <button
          onClick={() => setShowHelp(true)}
          className="ml-auto p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          title="Como funciona?"
        >
          <HelpCircle size={15} />
        </button>
      </div>

      {showHelp && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Brain size={16} className="text-brand-600" /> Inteligência de Receita
              </h2>
              <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                <TrendingDown size={14} className="text-red-500" /> Status: Ganhando / Perdendo
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                O status é determinado comparando o preço do concorrente com o valor em <strong>Meu Preço</strong>.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">
                    <TrendingDown size={11} /> Perdendo
                  </span>
                  <p className="text-xs text-gray-600">Preço do concorrente está <strong>abaixo</strong> do seu Meu Preço.</p>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">
                    <TrendingUp size={11} /> Ganhando
                  </span>
                  <p className="text-xs text-gray-600">Preço do concorrente está <strong>acima</strong> do seu Meu Preço.</p>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">
                    <Minus size={11} /> Neutro
                  </span>
                  <p className="text-xs text-gray-600">Sem <strong>Meu Preço</strong> cadastrado.</p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                <Brain size={14} className="text-brand-600" /> Como a projeção funciona
              </h3>
              <div className="space-y-2 mb-3">
                <div className="p-2.5 rounded-lg bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Cenário Conservador vs Moderado</p>
                  <p className="text-xs text-gray-500">Conservador: ~1 venda por 4 SKUs ajustados em 10 dias. Moderado: ~1 venda por 2 SKUs ajustados em 10 dias.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700 mb-1">SKUs para ganhar</p>
                  <p className="text-xs text-gray-500">Indique quantos anúncios perdendo você pretende ajustar.</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">Estimativa baseada no ticket médio. Não constitui garantia de receita.</p>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">SKUs Perdendo</p>
          <p className="text-xl font-bold text-red-500">{losingCount}</p>
          <p className="text-xs text-gray-400">{totalCount > 0 ? Math.round((losingCount / totalCount) * 100) : 0}% do total</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Ticket Médio</p>
          <p className="text-xl font-bold text-gray-800">R$ {medianPrice > 0 ? medianPrice.toFixed(0) : "—"}</p>
          <p className="text-xs text-gray-400">média perdendo</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-2">Cenário</p>
          <div className="flex gap-1">
            {[{ key: "conservative", label: "Conservador" }, { key: "moderate", label: "Moderado" }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setScenario(key)}
                className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${scenario === key ? "bg-brand-600 text-white" : "bg-white text-gray-600 border border-gray-200"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">SKUs para ganhar: <strong className="text-gray-700">{winableSkus}</strong></p>
          <input
            type="range" min={1} max={Math.max(losingCount, 1)} value={winableSkus}
            onChange={(e) => setWinableSkus(Number(e.target.value))}
            className="w-full accent-brand-600 cursor-pointer"
          />
          <p className="text-xs text-gray-400 mt-0.5">de {losingCount} perdendo</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[10, 15, 20].map((days) => {
          const val = project(days);
          const pct = maxProjection > 0 ? (val / maxProjection) * 100 : 0;
          return (
            <div key={days} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">{days} dias</p>
              <p className="text-base font-bold text-gray-800">
                R$ {val.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
