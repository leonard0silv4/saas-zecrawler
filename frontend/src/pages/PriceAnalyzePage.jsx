import { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ExternalLink, Filter, RefreshCw, X, AlertTriangle, TrendingUp, Play } from "lucide-react";
import api from "../services/api";
import { parseXML, getDefaultMyStoresUppercase } from "../lib/priceAnalyzeXml";

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

const GENERATE_TIMEOUT_MS = 15 * 60 * 1000;

export default function PriceAnalyzePage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [noXmlYet, setNoXmlYet] = useState(false);
  const [extractionDate, setExtractionDate] = useState(null);
  const [productGroups, setProductGroups] = useState([]);

  const [cookiesAlert, setCookiesAlert] = useState(false);

  const [filterAlert, setFilterAlert] = useState(false);
  const [filterCompetitor, setFilterCompetitor] = useState(false);
  const [filterNoComp, setFilterNoComp] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [detail, setDetail] = useState(null);
  /** `undefined` = ainda não carregou GET /settings; `null` = carregou e lista vazia (usa padrão env); array = nomes da conta */
  const [storeOverride, setStoreOverride] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/settings")
      .then(({ data }) => {
        if (cancelled) return;
        const arr = (data.mySellerNames || [])
          .map((s) => String(s).trim().toUpperCase())
          .filter(Boolean);
        setStoreOverride(arr.length > 0 ? arr : null);
      })
      .catch(() => {
        if (!cancelled) setStoreOverride(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const storesForBadge = useMemo(() => {
    if (storeOverride && storeOverride.length > 0) return storeOverride;
    return getDefaultMyStoresUppercase();
  }, [storeOverride]);

  const loadXml = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoXmlYet(false);
    try {
      const { status, text } = await fetchPriceAnalyzeXmlText();
      if (status === 404 || !text) {
        setProductGroups([]);
        setExtractionDate(null);
        setNoXmlYet(true);
        return;
      }
      const forParse =
        storeOverride === undefined
          ? undefined
          : storeOverride && storeOverride.length > 0
            ? storeOverride
            : undefined;
      const parsed = parseXML(text, forParse);
      setProductGroups(parsed.productGroups);
      setExtractionDate(parsed.extractionDate);
    } catch (e) {
      setError(e.message || "Erro ao carregar XML");
    } finally {
      setLoading(false);
    }
  }, [storeOverride]);

  useEffect(() => {
    loadXml();
  }, [loadXml]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setCookiesAlert(false);
    try {
      const { data } = await api.post(
        "/price-analyze/generate",
        { limit: 300 },
        { timeout: GENERATE_TIMEOUT_MS }
      );
      // Tinha links cadastrados mas nenhum produto foi extraído → cookies provavelmente inválidos/expirados
      if (data.urlsProcessadas > 0 && data.linhasProduto === 0) {
        setCookiesAlert(true);
      }
      await loadXml();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Erro ao gerar XML");
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Análise de preços</h1>
    
  
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
              onClick={loadXml}
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-900 font-medium">Nenhum XML gerado ainda.</p>
          <p className="text-sm text-amber-800 mt-1">
            Use links de <strong>listagem</strong> (<code className="text-xs">lista.mercadolivre.com.br</code>, busca{" "}
            <code className="text-xs">?q=</code>, loja com <code className="text-xs">_NoIndex_True</code>) para extrair{" "}
            <strong>vários</strong> anúncios como no Python. Anúncio único só gera uma linha. Catálogo:{" "}
            <code className="text-xs">/p/MLB…/s</code>.
          </p>
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
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-4 mb-4">
              <h3 className="font-semibold text-gray-900">{detail.nome}</h3>
              <button type="button" onClick={() => setDetail(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <ul className="space-y-2">
              {[...detail.products]
                .sort((a, b) => a.preco - b.preco)
                .map((p) => (
                  <li
                    key={p.id + p.url}
                    className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm ${
                      p.isMyStore ? "bg-emerald-50 border border-emerald-100" : "bg-gray-50"
                    }`}
                  >
                    <div>
                      <span className="font-medium">{p.vendedor}</span>
                      {p.isMyStore && <span className="ml-2 text-xs text-emerald-700">(sua loja)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{fmtMoney(p.preco)}</span>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-brand-600">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
