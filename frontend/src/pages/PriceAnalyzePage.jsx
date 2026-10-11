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
  const [noDataAlert, setNoDataAlert] = useState(false);

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
    setNoDataAlert(false);
    try {
      const { data } = await api.post(
        "/price-analyze/generate",
        { limit: 300 },
        { timeout: GENERATE_TIMEOUT_MS }
      );
      if (data.urlsProcessadas > 0 && data.linhasProduto === 0) {
        setNoDataAlert(true);
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
        <div className="w-10 h-10 border-4 border-brandSolid-400/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brandSolid-400/30 bg-brandSolid-500/10 text-brandSolid-300 shadow-[0_0_20px_-6px_rgb(30_123_255/0.7)]">
              <LineChart size={19} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-fg">Análise de concorrência</h1>
              <p className="mt-1 text-sm text-fg-muted">Compare seus preços com os concorrentes por SKU.</p>
            </div>
          </div>
          {extractionDate && (
            <p className="text-xs text-fg-muted mt-2">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neon/40 bg-neon/10 text-neon text-sm font-medium hover:bg-neon/20 disabled:opacity-50 shadow-[0_0_16px_-6px_rgb(var(--neon)/0.8)]"
            >
              <Play size={16} className={generating ? "animate-pulse" : ""} />
              {generating ? "Buscando dados" : "Buscar dados"}
            </button>
            <button
              type="button"
              onClick={reloadXml}
              disabled={loading || generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brandSolid-500 text-white text-sm font-medium hover:bg-brandSolid-400 disabled:opacity-50 shadow-glow-brand"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Recarregar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!storesLoading && myStores.length === 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <AlertTriangle size={16} className="shrink-0 text-warn" />
          <span className="flex-1">
            <strong>Suas lojas não foram identificadas.</strong> Configure em{" "}
            <strong>Configurações → Meus Sellers</strong> ou conecte uma conta Mercado Livre para que seus produtos sejam marcados corretamente na análise.
          </span>
          <div className="flex gap-2 shrink-0">
            <Link
              to="/settings"
              className="rounded-lg border border-warn/40 bg-warn/15 px-3 py-1 text-xs font-medium text-warn hover:bg-warn/25 transition-colors"
            >
              Configurações
            </Link>
            <Link
              to="/meli"
              className="rounded-lg border border-warn/50 px-3 py-1 text-xs font-medium text-warn hover:bg-warn/15 transition-colors"
            >
              Conectar conta ML
            </Link>
          </div>
        </div>
      )}

      {noDataAlert && !generating && (
        <div className="flex items-center gap-3 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <AlertTriangle size={16} className="shrink-0 text-warn" />
          <span>
            Nenhum produto foi extraído. A análise consulta a API oficial do Mercado Livre e precisa de{" "}
            <strong>ao menos 1 conta ML conectada</strong> com autorização válida.
          </span>
          <Link
            to="/meli"
            className="ml-auto shrink-0 rounded-lg bg-warn/15 border border-warn/40 px-3 py-1 text-xs font-medium text-warn hover:bg-warn/25 transition-colors"
          >
            Contas conectadas →
          </Link>
        </div>
      )}

      {noXmlYet && !generating && (
        <div className="glass border border-brandSolid-400/30 rounded-xl p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg border border-glow/40 bg-glow/10 flex items-center justify-center shrink-0">
              <TrendingUp size={20} className="text-glow" />
            </div>
            <div>
              <p className="font-semibold text-fg">Análise de Preços ainda não tem dados</p>
              <p className="text-sm text-fg-muted mt-0.5">
                Este módulo depende dos seus <strong>Links</strong> para funcionar. Veja como começar:
              </p>
            </div>
          </div>

          {/* Passos */}
          <ol className="space-y-3">
            <li className="flex gap-3 text-sm text-fg/90">
              <span className="shrink-0 w-6 h-6 rounded-full border border-glow/50 bg-glow/10 text-glow text-xs flex items-center justify-center font-semibold num">1</span>
              <div className="leading-relaxed">
                <strong>Cadastre links na página Links.</strong>{" "}
                Vá para <Link to="/links" className="text-brandSolid-300 font-medium hover:underline">Links</Link> e adicione
                as URLs dos produtos do Mercado Livre — tanto os seus anúncios quanto os dos concorrentes para o mesmo produto.
                Quanto mais sellers do mesmo produto você adicionar, mais rica fica a comparação.
              </div>
            </li>
            <li className="flex gap-3 text-sm text-fg/90">
              <span className="shrink-0 w-6 h-6 rounded-full border border-glow/50 bg-glow/10 text-glow text-xs flex items-center justify-center font-semibold num">2</span>
              <div className="leading-relaxed">
                <strong>Configure seus sellers em Configurações.</strong>{" "}
                Acesse <Link to="/settings" className="text-brandSolid-300 font-medium hover:underline">Configurações → Meus Sellers</Link> e
                informe os nomes das suas lojas no Mercado Livre. O sistema usa isso para separar <em>seus preços</em> dos preços da concorrência.
              </div>
            </li>
            <li className="flex gap-3 text-sm text-fg/90">
              <span className="shrink-0 w-6 h-6 rounded-full border border-glow/50 bg-glow/10 text-glow text-xs flex items-center justify-center font-semibold num">3</span>
              <div className="leading-relaxed">
                <strong>Clique em "Buscar dados" nesta página.</strong>{" "}
                O sistema varre todos os seus links, agrupa os produtos pelo SKU e monta a tabela comparativa com recomendações automáticas de preço.
              </div>
            </li>
          </ol>

          {/* Box explicativo da diferença */}
          <div className="bg-brandSolid-500/10 border border-brandSolid-400/30 rounded-lg p-4 text-sm text-fg/90">
            <p className="font-semibold text-brandSolid-300 mb-1">Qual a diferença entre Links e Análise de Preços?</p>
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
          <div className="glass rounded-xl border border-line/10 p-4 space-y-4">
            <p className="text-sm font-medium text-fg/90 flex items-center gap-2">
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
                    on ? "border-brand-500 bg-brandSolid-500/10 text-brandSolid-300" : "border-line/15 text-fg-muted"
                  }`}
                >
                  <I size={14} />
                  {label}
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs text-fg-muted mb-2">Vendedor</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStore(null)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium ${selectedStore === null ? "bg-brandSolid-500/20 text-fg ring-1 ring-inset ring-brandSolid-400/50 shadow-[0_0_14px_-6px_rgb(30_123_255/0.9)]" : "bg-ink/[0.06]"}`}
                >
                  Todos
                </button>
                {uniqueStores.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStore(st)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium max-w-[140px] truncate ${
                      selectedStore === st ? "bg-brandSolid-500/20 text-fg ring-1 ring-inset ring-brandSolid-400/50 shadow-[0_0_14px_-6px_rgb(30_123_255/0.9)]" : "bg-ink/[0.06]"
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
                className="text-xs text-fg-muted flex items-center gap-1 hover:text-fg"
              >
                <X size={12} /> Limpar filtros
              </button>
            )}
          </div>

          <p className="text-sm text-fg-muted">
            Exibindo <strong>{filtered.length}</strong> de <strong>{productGroups.length}</strong> grupos
          </p>

          <div className="glass rounded-xl border border-line/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink/[0.03] border-b border-line/10 text-left text-fg-muted">
                    <th className="px-4 py-3 font-medium">Produto</th>
                    <th className="px-4 py-3 font-medium">Melhor preço</th>
                    <th className="px-4 py-3 font-medium">Vendedor</th>
                    <th className="px-4 py-3 font-medium text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/[0.07]">
                  {filtered.map((g) => {
                    const sorted = [...g.products].sort((a, b) => a.preco - b.preco);
                    const best = sorted[0];
                    return (
                      <tr key={g.grupo} className="hover:bg-ink/[0.02]">
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex flex-wrap gap-1 mb-1">
                            {!g.products.some((p) => !p.isMyStore) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300">Sem concorrentes</span>
                            )}
                            {g.recommendation && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warn/15 text-warn">Alerta</span>
                            )}
                          </div>
                          {best?.urlOriginal ? (
                            <a
                              href={best.urlOriginal}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-fg hover:text-brandSolid-300 line-clamp-2"
                            >
                              {g.nome}
                            </a>
                          ) : (
                            <span className="font-medium text-fg">{g.nome}</span>
                          )}
                          {g.recommendation && (
                            <p className="text-xs text-warn mt-1 line-clamp-2">{g.recommendation}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-lg font-semibold text-neon">{fmtMoney(best?.preco || 0)}</div>
                          <div className="text-xs text-fg-muted">{best?.isMyStore ? "Sua loja" : best?.vendedor}</div>
                        </td>
                        <td className="px-4 py-3">
                          {best?.urlOriginal ? (
                            <a
                              href={best.urlOriginal}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-brandSolid-300 hover:underline"
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
                            className="text-brandSolid-300 text-sm font-medium hover:underline"
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
              <p className="text-center text-fg-muted py-12">Nenhum grupo neste filtro.</p>
            )}
          </div>
        </>
      )}

      {detail && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/70 backdrop-blur-md p-4" onClick={() => setDetail(null)}>
          <div
            className="glass glow-top !bg-surface-2/95 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradiente */}
            <div className="relative bg-gradient-to-r from-brandSolid-500/30 via-brandSolid-500/10 to-transparent border-b border-line/10 px-6 py-5 rounded-t-2xl flex-shrink-0">
              <h3 className="text-xl font-semibold text-fg pr-10 leading-snug">{detail.nome}</h3>
              <p className="text-fg-muted text-sm mt-0.5">SKU: {detail.grupo}</p>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="absolute right-4 top-4 text-fg-muted hover:text-fg hover:bg-ink/10 rounded-lg p-1.5 transition-all"
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
                      <div className="bg-neon/[0.07] border border-neon/25 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-neon tracking-wide">Melhor Preço</p>
                          <Trophy size={16} className="text-neon" />
                        </div>
                        <p className="text-2xl font-bold text-neon">{formatCurrency(bestPrice)}</p>
                      </div>

                      <div className="bg-brandSolid-500/[0.08] border border-brandSolid-400/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-brandSolid-300 tracking-wide">Maior Preço</p>
                          <Eye size={16} className="text-brandSolid-300" />
                        </div>
                        <p className="text-2xl font-bold text-brandSolid-300">{formatCurrency(detail.maxPrice)}</p>
                      </div>

                      <div className="bg-warn/[0.07] border border-warn/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-warn tracking-wide">Diferença</p>
                          <AlertCircle size={16} className="text-warn" />
                        </div>
                        <p className="text-2xl font-bold text-warn">{formatCurrency(detail.maxPrice - bestPrice)}</p>
                      </div>
                    </div>

                    {/* Badges de contagem */}
                    <div className="flex gap-2 flex-wrap">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-brandSolid-500/10 text-brandSolid-300 border border-brandSolid-400/30">
                        Total de anúncios: {sorted.length}
                      </span>
                      {myProducts.length > 0 && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-neon/10 text-neon border border-neon/25">
                          Seus anúncios: {myProducts.length}
                        </span>
                      )}
                    </div>

                    {/* Lista de concorrentes */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-brandSolid-500 rounded" />
                        <h4 className="text-base font-bold text-fg">Análise de Concorrentes</h4>
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
                                  ? "bg-neon/10 border-neon/25 hover:border-neon/50"
                                  : "bg-ink/[0.03] border-line/15 hover:border-line/25"
                              } transition-colors`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="font-semibold text-fg text-sm">{p.vendedor}</span>
                                    {p.isMyStore && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neon/25 text-neon">
                                        Sua Loja
                                      </span>
                                    )}
                                    {isBestPrice && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brandSolid-500/25 text-brandSolid-300">
                                        <Trophy size={10} /> Melhor
                                      </span>
                                    )}
                                  </div>
                                  {p.url && (
                                    <a
                                      href={p.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs text-brandSolid-300 hover:text-brandSolid-300 font-medium flex items-center gap-1"
                                    >
                                      Ver no Mercado Livre <ExternalLink size={11} />
                                    </a>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xl font-bold text-fg">{formatCurrency(p.preco)}</p>
                                  {diff !== 0 && (
                                    <p className={`text-xs font-semibold mt-0.5 ${diff > 0 ? "text-danger" : "text-neon"}`}>
                                      {diff > 0 ? "+" : ""}{formatCurrency(diff)} ({diffPercent > 0 ? "+" : ""}{diffPercent.toFixed(1)}%)
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isCompetitorSignificant && (
                                <div className="mt-3 flex items-start gap-2 p-2 bg-warn/10 border border-warn/30 rounded-lg text-warn text-xs">
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
