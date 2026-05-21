import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Trash2, ExternalLink, Tag, TrendingUp, TrendingDown, Minus, Search, X } from "lucide-react";
import api from "../services/api";
import { notifyError } from "../utils/notify.js";
import { useAuth } from "../contexts/AuthContext";

export default function LinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const storeName = "mercadolivre";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLink, setNewLink] = useState({ link: "", myPrice: "", tag: "" });
  const [adding, setAdding] = useState(false);

  const perPage = 20;
  const maxLinks = user?.planConfig?.maxLinks || 10;

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/links", { params: { page, perPage, storeName } });
      setLinks(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, storeName]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post("/links", newLink);
      setShowAdd(false);
      setNewLink({ link: "", myPrice: "", tag: "" });
      fetchLinks();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao adicionar link");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remover este link?")) return;
    await api.delete(`/links/${id}`);
    fetchLinks();
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/links/refresh/${storeName}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // Could parse SSE events here for progress
      }
      fetchLinks();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }

  function priceStatus(link) {
    if (!link.myPrice || !link.nowPrice) return "neutral";
    return link.nowPrice > link.myPrice ? "winning" : link.nowPrice < link.myPrice ? "losing" : "neutral";
  }

  const statusColors = {
    winning: "text-emerald-600 bg-emerald-50",
    losing: "text-red-600 bg-red-50",
    neutral: "text-gray-600 bg-gray-50",
  };

  const statusIcons = { winning: TrendingUp, losing: TrendingDown, neutral: Minus };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Links</h1>
          <p className="text-sm text-gray-500">{total} de {maxLinks} links utilizados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.min((total / maxLinks) * 100, 100)}%` }} />
        </div>
      </div>

  

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Novo Link</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <input type="url" required placeholder="URL do produto" value={newLink.link} onChange={(e) => setNewLink({ ...newLink, link: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              <div className="flex gap-3">
                <input type="number" step="0.01" placeholder="Meu preço" value={newLink.myPrice} onChange={(e) => setNewLink({ ...newLink, myPrice: e.target.value })}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
                <input type="text" placeholder="Tag (opcional)" value={newLink.tag} onChange={(e) => setNewLink({ ...newLink, tag: e.target.value })}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              </div>
              <button type="submit" disabled={adding}
                className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 disabled:opacity-50">
                {adding ? "Salvando..." : "Adicionar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : links.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-2">Nenhum link cadastrado</p>
          <button onClick={() => setShowAdd(true)} className="text-brand-600 text-sm font-medium hover:underline">Adicionar primeiro link</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Produto</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Preço Atual</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Último Preço</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Meu Preço</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => {
                  const status = priceStatus(link);
                  const StatusIcon = statusIcons[status];
                  return (
                    <tr key={link._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {link.image && <img src={link.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-xs">{link.name || "Sem título"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {link.seller && <span className="text-xs text-gray-400">{link.seller}</span>}
                              {link.full && <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">FULL</span>}
                              {link.tags?.map((t) => (
                                <span key={t} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        R$ {link.nowPrice?.toFixed(2) || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-400">
                        R$ {link.lastPrice?.toFixed(2) || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        R$ {link.myPrice?.toFixed(2) || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                          <StatusIcon size={12} />
                          {status === "winning" ? "Ganhando" : status === "losing" ? "Perdendo" : "Neutro"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a href={link.link} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                            <ExternalLink size={15} />
                          </a>
                          <button onClick={() => handleDelete(link._id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > perPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">Página {page} de {Math.ceil(total / perPage)}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40">Anterior</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page * perPage >= total}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40">Próxima</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
