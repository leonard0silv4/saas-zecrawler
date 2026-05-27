import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, RefreshCw, Trash2, Tag, TrendingUp, TrendingDown, Minus, Search, X } from "lucide-react";
import api from "../services/api";
import { notifyError } from "../utils/notify.js";
import { useAuth } from "../contexts/AuthContext";

export default function LinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const storeName = "mercadolivre";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLink, setNewLink] = useState({ link: "", myPrice: "", tag: "" });
  const [adding, setAdding] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLink, setEditLink] = useState(null);
  const [editMyPrice, setEditMyPrice] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Filtros
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "winning" | "losing"
  const [filterTag, setFilterTag] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [availableTags, setAvailableTags] = useState([]);

  const perPage = 20;
  const maxLinks = user?.planConfig?.maxLinks || 10;

  // Busca tags disponíveis ao montar
  useEffect(() => {
    api.get("/links/tags")
      .then(({ data }) => setAvailableTags(data))
      .catch(() => {});
  }, []);

  // Debounce de 400ms na busca por título
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filterSearch), 400);
    return () => clearTimeout(t);
  }, [filterSearch]);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, perPage, storeName };
      if (filterTag)              params.tag    = filterTag;
      if (debouncedSearch)        params.search = debouncedSearch;
      if (filterStatus !== "all") params.status = filterStatus;
      const { data } = await api.get("/links", { params });
      setLinks(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, storeName, filterTag, debouncedSearch, filterStatus]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  function handleFilterStatus(value) { setFilterStatus(value); setPage(1); }
  function handleFilterTag(value)    { setFilterTag(value);    setPage(1); }
  function handleFilterSearch(value) { setFilterSearch(value); setPage(1); }

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

  function openEdit(link) {
    setEditLink(link);
    setEditMyPrice(link.myPrice != null ? String(link.myPrice) : "");
    setEditTags(link.tags?.join(", ") || "");
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editLink) return;
    setEditSaving(true);
    try {
      const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean);
      const { data } = await api.put(`/links/${editLink._id}`, {
        myPrice: Number(editMyPrice) || 0,
        tags,
      });
      setLinks((prev) => prev.map((l) => (l._id === data._id ? data : l)));
      setEditOpen(false);
      setEditLink(null);
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao salvar");
    } finally {
      setEditSaving(false);
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
        decoder.decode(value); // consume SSE stream
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
    losing:  "text-red-600 bg-red-50",
    neutral: "text-gray-600 bg-gray-50",
  };

  const statusIcons = { winning: TrendingUp, losing: TrendingDown, neutral: Minus };

  const hasFilters = filterStatus !== "all" || filterTag !== "" || filterSearch !== "";

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
      <div className="mb-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all"
            style={{ width: `${Math.min((total / maxLinks) * 100, 100)}%` }} />
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
        {/* Busca por título */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={filterSearch}
            onChange={(e) => handleFilterSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
          />
          {filterSearch && (
            <button
              onClick={() => handleFilterSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filtro Status */}
        <div className="flex gap-1">
          {[
            { value: "all",     label: "Todos",    Icon: Minus },
            { value: "winning", label: "Ganhando", Icon: TrendingUp },
            { value: "losing",  label: "Perdendo", Icon: TrendingDown },
          ].map(({ value, label, Icon }) => (
            <button key={value}
              onClick={() => handleFilterStatus(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                filterStatus === value
                  ? value === "winning" ? "bg-emerald-600 text-white"
                    : value === "losing"  ? "bg-red-500 text-white"
                    : "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Filtro Tag */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Tag size={13} className="text-gray-400 flex-shrink-0" />
            <select
              value={filterTag}
              onChange={(e) => handleFilterTag(e.target.value)}
              className="px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:border-brand-400 outline-none cursor-pointer">
              <option value="">Todas as Tags</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* Limpar filtros */}
        {hasFilters && (
          <button
            onClick={() => { setFilterStatus("all"); setFilterTag(""); handleFilterSearch(""); }}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={12} /> Limpar
          </button>
        )}
      </div>

      {/* Add modal */}
      {showAdd && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Novo Link</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <input type="url" required placeholder="URL do produto"
                value={newLink.link} onChange={(e) => setNewLink({ ...newLink, link: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              <div className="flex gap-3">
                <input type="number" step="0.01" placeholder="Meu preço"
                  value={newLink.myPrice} onChange={(e) => setNewLink({ ...newLink, myPrice: e.target.value })}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
                <input type="text" placeholder="Tag (opcional)"
                  value={newLink.tag} onChange={(e) => setNewLink({ ...newLink, tag: e.target.value })}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              </div>
              <button type="submit" disabled={adding}
                className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 disabled:opacity-50">
                {adding ? "Salvando..." : "Adicionar"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit modal */}
      {editOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setEditOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Editar Link</h2>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3 truncate">{editLink?.name || "Sem título"}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 uppercase">Meu Preço</label>
                <input type="number" step="0.01" value={editMyPrice}
                  onChange={(e) => setEditMyPrice(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-600 uppercase">Tags (separadas por vírgula)</label>
                <input type="text" value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="minha-loja, promocao"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setEditOpen(false)}
                className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button type="button" disabled={editSaving} onClick={handleEditSave}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50">
                {editSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : links.length === 0 ? (
        <div className="text-center py-12">
          {hasFilters ? (
            <>
              <p className="text-gray-400 mb-2">Nenhum resultado para os filtros aplicados</p>
              <button
                onClick={() => { setFilterStatus("all"); setFilterTag(""); handleFilterSearch(""); }}
                className="text-brand-600 text-sm font-medium hover:underline">
                Limpar filtros
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400 mb-2">Nenhum link cadastrado</p>
              <button onClick={() => setShowAdd(true)}
                className="text-brand-600 text-sm font-medium hover:underline">
                Adicionar primeiro link
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Produto</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Preço Atual</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 min-w-[180px]">Histórico (7d)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Meu Preço</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => {
                  const status = priceStatus(link);
                  const StatusIcon = statusIcons[status];

                  // últimas 7 entradas do histórico
                  const hist = link.history?.slice(-7) || [];

                  return (
                    <tr key={link._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      {/* Produto */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {link.image && (
                            <img src={link.image} alt=""
                              className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <a
                              href={link.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-gray-900 truncate max-w-xs hover:text-brand-600 hover:underline block"
                              title={link.name || "Sem título"}>
                              {link.name || "Sem título"}
                            </a>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {link.seller && (
                                <span className="text-xs text-gray-400">{link.seller}</span>
                              )}
                              {link.full && (
                                <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">
                                  FULL
                                </span>
                              )}
                              {link.tags?.map((t) => (
                                <span key={t}
                                  className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Preço Atual */}
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        R$ {link.nowPrice?.toFixed(2) ?? "—"}
                      </td>

                      {/* Histórico (7d) — chips coloridos */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto max-w-[220px]">
                          {hist.length > 0 ? (
                            hist.map((h, i, arr) => {
                              const prev = arr[i - 1];
                              const dir =
                                prev == null           ? "same"
                                : h.price < prev.price ? "down"
                                : h.price > prev.price ? "up"
                                : "same";
                              return (
                                <span key={i}
                                  title={`R$ ${h.price?.toFixed(2)}`}
                                  className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-mono whitespace-nowrap ${
                                    dir === "down" ? "bg-green-50 text-green-700"
                                    : dir === "up" ? "bg-red-50 text-red-700"
                                    : "bg-gray-100 text-gray-500"
                                  }`}>
                                  {h.price?.toFixed(2)}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </div>
                      </td>

                      {/* Meu Preço */}
                      <td className="px-4 py-3 text-right font-mono">
                        R$ {link.myPrice?.toFixed(2) ?? "—"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                          <StatusIcon size={12} />
                          {status === "winning" ? "Ganhando" : status === "losing" ? "Perdendo" : "Neutro"}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(link)}
                            className="p-1.5 hover:bg-brand-50 rounded-lg text-gray-400 hover:text-brand-600"
                            title="Editar">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(link._id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                            title="Remover">
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
              <span className="text-sm text-gray-500">
                Página {page} de {Math.ceil(total / perPage)}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40">
                  Anterior
                </button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page * perPage >= total}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40">
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
