import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ExternalLink, Filter, LineChart, RefreshCw, X, AlertTriangle, TrendingUp, Play, Trophy, Eye, AlertCircle } from "lucide-react";
import api from "../services/api";
import { parseXML, PRICE_DIFF_THRESHOLD } from "../lib/priceAnalyzeXml";
import { useMyStores } from "../hooks/useMyStores";

/** XML pode retornar 404 sem ser “erro” de sessão — axios global rejeita 404. */
async function fetchPriceAnalyzeXmlText() {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/price-analyze/xml", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 404) return { status: 404, text: null };
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const text = await res.text();
  return { status: 200, text };
}

function fmtMoney(n) {
  return `R$ ${Number(n).toFixed(2)}`;
}

function formatCurrency(n) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

const GENERATE_TIMEOUT_MS = 15 * 60 * 1000;

export default function PriceAnalyzePage() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [cookiesAlert, setCookiesAlert] = useState(false);

  const [filterAlert, setFilterAlert] = useState(false);
  const [filterCompetitor, setFilterCompetitor] = useState(false);
  const [filterNoComp, setFilterNoComp] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [detail, setDetail] = useState(null);
  const { myStores, loading: storesLoading } = useMyStores();

  const storesForBadge = useMemo(() => myStores, [myStores]);

  const { data: xmlResult, isLoading: loading, error: xmlError, refetch: reloadXml } = useQuery({
    queryKey: ["price-analyze-xml"],
    queryFn: fetchPriceAnalyzeXmlText,
    staleTime: Infinity,
    retry: false,
  });

  const noXmlYet = !loading && !xmlError && (!xmlResult || xmlResult.status === 404 || !xmlResult.text);
  const error = xmlError?.message || generateError;

  const parsed = useMemo(() => {
    if (!xmlResult?.text) return null;
    return parseXML(xmlResult.text, myStores);
  }, [xmlResult, myStores]);

  const productGroups = parsed?.productGroups ?? [];
  const extractionDate = parsed?.extractionDate ?? null;

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    setCookiesAlert(false);
    try {
      const { data } = await api.post(
        "/price-analyze/generate",
        { limit: 300 },
        { timeout: GENERATE_TIMEOUT_MS }
      );
      if (data.urlsProcessadas > 0 && data.linhasProduto === 0) {
        setCookiesAlert(true);
      }
      queryClient.invalidateQueries({ queryKey: ["price-analyze-xml"] });
    } catch (e) {
      setGenerateError(e.response?.data?.error || e.message || "Erro ao gerar XML");
    } finally {
      setGenerating(false);
    }
  }

  const filtered = useMemo(() => {
    let list = productGroups;
    if (selectedStore) {
      list = list.filter((g) =>
        g.products.some((p) => p.vendedor.toUpperCase().includes(selectedStore.toUpperCase()))
      );
    }
    if (!filterAlert && !filterCompetitor && !filterNoComp) return list;
    return list.filter((g) => {
      const sorted = [...g.products].sort((a, b) => a.preco - b.preco);
      const best = sorted[0];
      const hasComp = sorted.some((p) => !p.isMyStore);
      let ok = true;
      if (filterAlert) ok = ok && !!g.recommendation;
      if (filterCompetitor) ok = ok && best && !best.isMyStore;
      if (filterNoComp) ok = ok && !hasComp;
      return ok;
    });
  }, [productGroups, filterAlert, filterCompetitor, filterNoComp, selectedStore]);

  const uniqueStores = useMemo(() => {
    const s = new Set();
    productGroups.forEach((g) => g.products.forEach((p) => s.add(p.vendedor)));
    return [...s].sort();
  }, [productGroups]);

  if (loading && !generating && productGroups.length === 0 && !error && !noXmlYet) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LineChart size={22} className="text-brand-600" />
            Análise de concorrência
          </h1>
    
  
          {extractionDate && (
            <p className="text-xs text-gray-500 mt-2">
              XML extraído em:{" "}
              <strong>
                {new Date(extractionDate).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              <Play size={16} className={generating ? "animate-pulse" : ""} />
              {generating ? "Buscando dados" : "Buscar dados"}
            </button>
            <button
              type="button"
              onClick={reloadXml}
              disabled={loading || generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Recarregar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!storesLoading && myStores.length === 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
          <span className="flex-1">
            <strong>Suas lojas não foram identificadas.</strong> Configure em{" "}
            <strong>Configurações → Meus Sellers</strong> ou conecte uma conta Mercado Livre para que seus produtos sejam marcados corretamente na análise.
          </span>
          <div className="flex gap-2 shrink-0">
            <Link
              to="/settings"
              className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
            >
              Configurações
            </Link>
            <Link
              to="/meli"
              className="rounded-lg border border-amber-400 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              Conectar conta ML
            </Link>
          </div>
        </div>
      )}

      {cookiesAlert && !generating && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle size={16} className="shrink-0 text-red-600" />
          <span>
            Nenhum produto foi extraído. Seus cookies do Mercado Livre podem estar{" "}
            <strong>desconfigurados ou expirados</strong>. O sistema não conseguiu buscar os dados.
          </span>
          <Link
            to="/setup-cookies"
            className="ml-auto shrink-0 rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
          >
            Configurar cookies →
          </Link>
        </div>
      )}

      {noXmlYet && !generating && (
        <div className="bg-white border border-sky-200 rounded-xl p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Análise de Preços ainda não tem dados</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Este módulo depende dos seus <strong>Links</strong> para funcionar. Veja como começar:
              </p>
            </div>
          </div>

          {/* Passos */}
          <ol className="space-y-3">
            <li className="flex gap-3 text-sm text-gray-700">
              <span className="shrink-0 w-6 h-6 rounded-full bg-sky-500 text-white text-xs flex items-center justify-center font-bold">1</span>
              <div className="leading-relaxed">
                <strong>Cadastre links na página Links.</strong>{" "}
                Vá para <Link to="/links" className="text-sky-600 font-medium hover:underline">Links</Link> e adicione
                as URLs dos produtos do Mercado Livre — tanto os seus anúncios quanto os dos concorrentes para o mesmo produto.
                Quanto mais sellers do mesmo produto você adicionar, mais rica fica a comparação.
              </div>
            </li>
            <li className="flex gap-3 text-sm text-gray-700">
              <span className="shrink-0 w-6 h-6 rounded-full bg-sky-500 text-white text-xs flex items-center justify-center font-bold">2</span>
              <div className="leading-relaxed">
                <strong>Configure seus sellers em Configurações.</strong>{" "}
                Acesse <Link to="/settings" className="text-sky-600 font-medium hover:underline">Configurações → Meus Sellers</Link> e
                informe os nomes das suas lojas no Mercado Livre. O sistema usa isso para separar <em>seus preços</em> dos preços da concorrência.
              </div>
            </li>
            <li className="flex gap-3 text-sm text-gray-700">
              <span className="shrink-0 w-6 h-6 rounded-full bg-sky-500 text-white text-xs flex items-center justify-center font-bold">3</span>
              <div className="leading-relaxed">
                <strong>Clique em "Buscar dados" nesta página.</strong>{" "}
                O sistema varre todos os seus links, agrupa os produtos pelo SKU e monta a tabela comparativa com recomendações automáticas de preço.
              </div>
            </li>
          </ol>

          {/* Box explicativo da diferença */}
          <div className="bg-sky-50 border border-sky-100 rounded-lg p-4 text-sm text-gray-700">
            <p className="font-semibold text-sky-800 mb-1">Qual a diferença entre Links e Análise de Preços?</p>
            <p className="leading-relaxed">
              <strong>Links</strong> acompanha cada URL individualmente — histórico de preço, seller e status (ganhando/perdendo).{" "}
              <strong>Análise de Preços</strong> vai além: ela junta todos os links do mesmo produto (pelo SKU), coloca todos os
              sellers lado a lado e gera recomendações automáticas quando a diferença superar 10% do melhor concorrente.
            </p>
          </div>
        </div>
      )}

      {productGroups.length > 0 && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Filter size={16} /> Filtros
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { k: "alert", label: "Com alerta", on: filterAlert, set: setFilterAlert, icon: AlertTriangle },
                { k: "comp", label: "Concorrente na frente", on: filterCompetitor, set: setFilterCompetitor, icon: TrendingUp },
                { k: "nc", label: "Sem concorrentes", on: filterNoComp, set: setFilterNoComp, icon: Filter },
              ].map(({ k, label, on, set, icon: I }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set(!on)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${
                    on ? "border-brand-500 bg-brand-50 text-brand-800" : "border-gray-200 text-gray-600"
                  }`}
                >
                  <I size={14} />
                  {label}
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Vendedor</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStore(null)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium ${selectedStore === null ? "bg-brand-600 text-white" : "bg-gray-100"}`}
                >
                  Todos
                </button>
                {uniqueStores.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStore(st)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium max-w-[140px] truncate ${
                      selectedStore === st ? "bg-brand-600 text-white" : "bg-gray-100"
                    }`}
                    title={st}
                  >
                    {st}
                    {storesForBadge.includes(st.toUpperCase()) && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 ml-1 align-middle" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            {(filterAlert || filterCompetitor || filterNoComp || selectedStore) && (
              <button
                type="button"
                onClick={() => {
                  setFilterAlert(false);
                  setFilterCompetitor(false);
                  setFilterNoComp(false);
                  setSelectedStore(null);
                }}
                className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-800"
              >
                <X size={12} /> Limpar filtros
              </button>
            )}
          </div>

          <p className="text-sm text-gray-600">
            Exibindo <strong>{filtered.length}</strong> de <strong>{productGroups.length}</strong> grupos
          </p>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-600">
                    <th className="px-4 py-3 font-medium">Produto</th>
                    <th className="px-4 py-3 font-medium">Melhor preço</th>
                    <th className="px-4 py-3 font-medium">Vendedor</th>
                    <th className="px-4 py-3 font-medium text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((g) => {
                    const sorted = [...g.products].sort((a, b) => a.preco - b.preco);
                    const best = sorted[0];
                    return (
                      <tr key={g.grupo} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex flex-wrap gap-1 mb-1">
                            {!g.products.some((p) => !p.isMyStore) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">Sem concorrentes</span>
                            )}
                            {g.recommendation && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">Alerta</span>
                            )}
                          </div>
                          {best?.urlOriginal ? (
                            <a
                              href={best.urlOriginal}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-gray-900 hover:text-brand-600 line-clamp-2"
                            >
                              {g.nome}
                            </a>
                          ) : (
                            <span className="font-medium text-gray-900">{g.nome}</span>
                          )}
                          {g.recommendation && (
                            <p className="text-xs text-amber-800 mt-1 line-clamp-2">{g.recommendation}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-lg font-semibold text-emerald-600">{fmtMoney(best?.preco || 0)}</div>
                          <div className="text-xs text-gray-500">{best?.isMyStore ? "Sua loja" : best?.vendedor}</div>
                        </td>
                        <td className="px-4 py-3">
                          {best?.urlOriginal ? (
                            <a
                              href={best.urlOriginal}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                            >
                              {best.vendedor}
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span>{best?.vendedor}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setDetail(g)}
                            className="text-brand-600 text-sm font-medium hover:underline"
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <p className="text-center text-gray-500 py-12">Nenhum grupo neste filtro.</p>
            )}
          </div>
        </>
      )}

      {detail && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDetail(null)}>
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradiente */}
            <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 rounded-t-2xl flex-shrink-0">
              <h3 className="text-xl font-bold text-white pr-10 leading-snug">{detail.nome}</h3>
              <p className="text-blue-100 text-sm mt-0.5">SKU: {detail.grupo}</p>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="absolute right-4 top-4 text-white hover:bg-white/20 rounded-lg p-1.5 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Cards de resumo */}
              {(() => {
                const sorted = [...detail.products].sort((a, b) => a.preco - b.preco);
                const bestPrice = sorted[0].preco;
                const myProducts = sorted.filter((p) => p.isMyStore);

                const analyzePrice = (price) => {
                  const diff = price - bestPrice;
                  const diffPercent = (diff / bestPrice) * 100;
                  return { diff, diffPercent };
                };

                return (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Melhor Preço</p>
                          <Trophy size={16} className="text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(bestPrice)}</p>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Maior Preço</p>
                          <Eye size={16} className="text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(detail.maxPrice)}</p>
                      </div>

                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Diferença</p>
                          <AlertCircle size={16} className="text-amber-600" />
                        </div>
                        <p className="text-2xl font-bold text-amber-700">{formatCurrency(detail.maxPrice - bestPrice)}</p>
                      </div>
                    </div>

                    {/* Badges de contagem */}
                    <div className="flex gap-2 flex-wrap">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        Total de anúncios: {sorted.length}
                      </span>
                      {myProducts.length > 0 && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                          Seus anúncios: {myProducts.length}
                        </span>
                      )}
                    </div>

                    {/* Lista de concorrentes */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-blue-600 rounded" />
                        <h4 className="text-base font-bold text-gray-900">Análise de Concorrentes</h4>
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {sorted.map((p) => {
                          const { diff, diffPercent } = analyzePrice(p.preco);
                          const isBestPrice = p.preco === bestPrice;
                          const isCompetitorSignificant = !p.isMyStore && Math.abs(diffPercent) > PRICE_DIFF_THRESHOLD;

                          return (
                            <div
                              key={p.id + p.url}
                              className={`border-2 rounded-xl p-4 ${
                                p.isMyStore
                                  ? "bg-green-50 border-green-200 hover:border-green-300"
                                  : "bg-gray-50 border-gray-200 hover:border-gray-300"
                              } transition-colors`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="font-semibold text-gray-900 text-sm">{p.vendedor}</span>
                                    {p.isMyStore && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-200 text-green-800">
                                        Sua Loja
                                      </span>
                                    )}
                                    {isBestPrice && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                                        <Trophy size={10} /> Melhor
                                      </span>
                                    )}
                                  </div>
                                  {p.url && (
                                    <a
                                      href={p.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    >
                                      Ver no Mercado Livre <ExternalLink size={11} />
                                    </a>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xl font-bold text-gray-900">{formatCurrency(p.preco)}</p>
                                  {diff !== 0 && (
                                    <p className={`text-xs font-semibold mt-0.5 ${diff > 0 ? "text-red-600" : "text-green-600"}`}>
                                      {diff > 0 ? "+" : ""}{formatCurrency(diff)} ({diffPercent > 0 ? "+" : ""}{diffPercent.toFixed(1)}%)
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isCompetitorSignificant && (
                                <div className="mt-3 flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
                                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                  <span className="font-semibold">
                                    Diferença significativa: {Math.abs(diffPercent).toFixed(1)}% {diffPercent > 0 ? "acima" : "abaixo"} do melhor preço
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
