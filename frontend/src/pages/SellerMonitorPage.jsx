import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Loader2, Package, Plus, RefreshCw, Store, Trash2, Play } from "lucide-react";
import api from "../services/api";
import { format } from "date-fns";


function fmtAgo(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d) / 1000);
  if (sec < 60) return "agora";
  if (sec < 3600) return `há ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `há ${Math.floor(sec / 3600)} h`;
  return d.toLocaleDateString("pt-BR");
}

export default function SellerMonitorPage() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const prevRef = useRef(new Map());

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/seller-monitor");
      setSellers(data);
      prevRef.current = new Map(data.map((s) => [s._id, s]));
    } catch {
      alert("Erro ao carregar sellers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const loadProducts = useCallback(async (id) => {
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/seller-monitor/${id}/products`);
      setProducts(data);
    } catch {
      alert("Erro ao carregar produtos");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadAlerts = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/seller-monitor/${id}/alerts`);
      setAlerts(data);
    } catch {
      alert("Erro ao carregar alertas");
    }
  }, []);

  useEffect(() => {
    const tick = async () => {
      try {
        const { data } = await api.get("/seller-monitor");
        const prev = prevRef.current;
        const curSel = selectedId;
        let reload = false;
        data.forEach((s) => {
          const was = prev.get(s._id);
          if (!was) return;
          const done = was.scraping && !s.scraping;
          const cron = !was.scraping && !s.scraping && was.lastRunAt !== s.lastRunAt;
          if ((done || cron) && s._id === curSel) reload = true;
        });
        setSellers(data);
        prevRef.current = new Map(data.map((s) => [s._id, s]));
        if (reload && curSel) {
          loadProducts(curSel);
          loadAlerts(curSel);
        }
      } catch {
        /* silencioso */
      }
    };
    const t = setInterval(tick, sellers.some((s) => s.scraping) ? 4000 : 30000);
    return () => clearInterval(t);
  }, [sellers, selectedId, loadProducts, loadAlerts]);

  function selectSeller(s) {
    setSelectedId(s._id);
    setTab("products");
    loadProducts(s._id);
    loadAlerts(s._id);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setAdding(true);
    try {
      const { data } = await api.post("/seller-monitor", { url: newUrl.trim(), name: newName.trim() });
      setSellers((prev) => [{ ...data, totalProducts: 0, unreadAlerts: 0 }, ...prev]);
      setAddOpen(false);
      setNewUrl("");
      setNewName("");
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao cadastrar");
    } finally {
      setAdding(false);
    }
  }

  async function handleRun(s) {
    try {
      await api.post(`/seller-monitor/${s._id}/run`);
      setSellers((prev) => prev.map((x) => (x._id === s._id ? { ...x, scraping: true } : x)));
    } catch (err) {
      if (err.response?.status === 409) alert("Scraping já em andamento");
      else alert("Erro ao iniciar");
    }
  }

  async function handleDelete(s) {
    if (!confirm("Remover este seller e todos os dados?")) return;
    await api.delete(`/seller-monitor/${s._id}`);
    setSellers((prev) => prev.filter((x) => x._id !== s._id));
    if (selectedId === s._id) {
      setSelectedId(null);
      setProducts([]);
      setAlerts([]);
    }
  }

  async function markRead(aid) {
    await api.put(`/seller-monitor/alerts/${aid}/read`);
    setAlerts((prev) => prev.map((a) => (a._id === aid ? { ...a, read: true } : a)));
  }

  async function markAllRead() {
    if (!selectedId) return;
    await api.put(`/seller-monitor/${selectedId}/alerts/read-all`);
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }

  const selected = sellers.find((s) => s._id === selectedId);
  const unread = sellers.reduce((acc, s) => acc + (s.unreadAlerts || 0), 0);

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-8rem)]">
      <aside className="lg:w-72 shrink-0 bg-white rounded-xl border border-gray-100 flex flex-col max-h-[40vh] lg:max-h-none">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-900 flex items-center gap-2">
            <Store size={18} className="text-brand-600" />
            Sellers
            {unread > 0 && (
              <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Bell size={10} /> {unread}
              </span>
            )}
          </span>
          <button type="button" onClick={fetchSellers} className="p-1.5 text-gray-500 hover:bg-gray-50 rounded-lg">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-gray-400" />
            </div>
          ) : sellers.length === 0 ? (
            <p className="text-sm text-gray-500 p-3">Nenhum seller. Cadastre um.</p>
          ) : (
            sellers.map((s) => (
              <div
                key={s._id}
                className={`rounded-lg border p-2 text-sm cursor-pointer transition-colors ${
                  selectedId === s._id ? "border-brand-500 bg-brand-50" : "border-gray-100 hover:bg-gray-50"
                }`}
                onClick={() => selectSeller(s)}
              >
                <div className="font-medium text-gray-900 truncate">{s.name || "Sem nome"}</div>
                <div className="text-xs text-gray-500 truncate">{s.url}</div>
                <div className="flex items-center justify-between mt-2 gap-1">
                  <span className="text-xs text-gray-500">
                    {s.scraping ? "Scraping…" : `${s.totalProducts || 0} itens · ${fmtAgo(s.lastRunAt)}`}
                  </span>
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleRun(s)}
                      className="p-1 text-brand-600 hover:bg-brand-100 rounded"
                      title="Atualizar"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="m-2 flex items-center justify-center gap-2 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          <Plus size={16} /> Novo seller
        </button>
      </aside>

      <main className="flex-1 bg-white rounded-xl border border-gray-100 flex flex-col min-h-[320px]">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
            <Package size={40} className="opacity-30 mb-3" />
            <p className="font-medium text-gray-700">Selecione um seller</p>
            <p className="text-sm text-center mt-1">URLs de listagem do Mercado Livre (página da loja).</p>
          </div>
        ) : (
          <>
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="font-semibold text-gray-900">{selected?.name || "Seller"}</h2>
              <p className="text-xs text-gray-500 truncate">{selected?.url}</p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setTab("products")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    tab === "products" ? "bg-brand-100 text-brand-800" : "text-gray-600"
                  }`}
                >
                  Produtos ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("alerts")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    tab === "alerts" ? "bg-brand-100 text-brand-800" : "text-gray-600"
                  }`}
                >
                  Alertas ({alerts.filter((a) => !a.read).length} novos)
                </button>
                {tab === "alerts" && alerts.some((a) => !a.read) && (
                  <button type="button" onClick={markAllRead} className="text-xs text-brand-600 ml-auto">
                    Marcar todos lidos
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {tab === "products" && (
                <>
                  {loadingDetail ? (
                    <Loader2 className="animate-spin text-gray-400 mx-auto block mt-8" />
                  ) : (
                    <ul className="space-y-2">
                      {products.map((p) => (
                        <li key={p._id} className="flex gap-3 text-sm border border-gray-100 rounded-lg p-2">
                          {p.image && <img src={p.image} alt="" className="w-14 h-14 object-cover rounded bg-gray-100" />}
                          <div className="min-w-0 flex-1">
                            <a href={p.url} target="_blank" rel="noreferrer" className="font-medium text-gray-900 hover:text-brand-600 line-clamp-2">
                              {p.name}
                            </a>
                            <div className="text-emerald-600 font-semibold mt-1">R$ {Number(p.currentPrice).toFixed(2)}</div>
                            {(p.isNew || p.priceChanged) && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded">
                                {p.isNew ? "Novo" : ""}
                                {p.priceChanged ? "Preço alterado" : ""}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!loadingDetail && products.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-8">Nenhum produto ainda. Rode o scraping.</p>
                  )}
                </>
              )}
              {tab === "alerts" && (
                <ul className="space-y-2">
                  {alerts.map((a) => (
                    <li
                      key={a._id}
                      className={`text-sm border rounded-lg p-3 ${a.read ? "border-gray-100 bg-gray-50" : "border-amber-200 bg-amber-50/50"}`}
                    >
                      <div className="font-medium">{format(a.createdAt, "dd/MM/yy - ")} {a.type === "new_product" ? "Produto novo" : "Mudança de preço"}
                        

                      </div>
                      <a href={a.productUrl} target="_blank" rel="noreferrer" className="text-brand-600 text-xs line-clamp-2">
                        {a.productName} 
                      </a>
                      
                      {a.type === "price_change" && (
                        <div className="text-xs text-gray-600 mt-1">
                          R$ {a.oldPrice?.toFixed(2)} → R$ {a.newPrice?.toFixed(2)}
                        </div>
                      )}
                      {!a.read && (
                        <button type="button" onClick={() => markRead(a._id)} className="text-xs text-brand-600 mt-2">
                          Marcar lido
                        </button>
                      )}
                    </li>
                  ))}
                  {alerts.length === 0 && <p className="text-gray-500 text-sm text-center py-8">Sem alertas.</p>}
                </ul>
              )}
            </div>
          </>
        )}
      </main>

      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAddOpen(false)}>
          <form
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAdd}
          >
            <h3 className="font-semibold text-lg">Cadastrar seller</h3>
            <div>
              <label className="text-sm text-gray-600">URL da listagem *</label>
              <input
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://lista.mercadolivre.com.br/..."
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Nome (opcional)</label>
              <input
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" className="px-4 py-2 text-sm text-gray-600" onClick={() => setAddOpen(false)}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {adding ? "Salvando…" : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
