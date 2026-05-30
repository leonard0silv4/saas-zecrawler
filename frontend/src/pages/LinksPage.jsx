import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Pencil, RefreshCw, Trash2, Tag, TrendingUp, TrendingDown, Minus,
  Search, X, Link2, MoreVertical, ExternalLink, ChevronUp, ChevronDown,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../services/api";
import { notifyError } from "../utils/notify.js";
import { useAuth } from "../contexts/AuthContext";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { AISection }      from "../components/links/AISection";
import { AddLinkModal }   from "../components/links/AddLinkModal";
import { EditLinkModal }  from "../components/links/EditLinkModal";

// ─── Página principal ────────────────────────────────────────────────────────

export default function LinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const storeName = "mercadolivre";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modais
  const [showAdd, setShowAdd] = useState(false);
  const [newLink, setNewLink] = useState({ link: "", myPrice: "", tag: "" });
  const [adding, setAdding] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLink, setEditLink] = useState(null);
  const [editMyPrice, setEditMyPrice] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Filtros
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTag, setFilterTag] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterSku, setFilterSku] = useState("");
  const [filterSeller, setFilterSeller] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedSku, setDebouncedSku] = useState("");
  const [availableTags, setAvailableTags] = useState([]);
  const [availableSellers, setAvailableSellers] = useState([]);

  // Ordenação
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", dir: "desc" });

  // Menu dropdown por linha
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // IA
  const [aiData, setAiData] = useState(null);
  const [scenario, setScenario] = useState("conservative");
  const [winableSkus, setWinableSkus] = useState(1);

  const perPage = 20;
  const maxLinks = user?.planConfig?.maxLinks || 10;

  // Busca inicial de metadados
  useEffect(() => {
    api.get("/links/tags").then(({ data }) => setAvailableTags(data)).catch(() => {});
    api.get("/links/sellers").then(({ data }) => setAvailableSellers(data)).catch(() => {});
    api.get("/links/stats", { params: { storeName } }).then(({ data }) => {
      setAiData(data);
      setWinableSkus(Math.max(1, Math.min(4, data.losingCount || 1)));
    }).catch(() => {});
  }, []);

  // Debounce busca por título
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filterSearch), 400);
    return () => clearTimeout(t);
  }, [filterSearch]);

  // Debounce busca por SKU
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSku(filterSku), 400);
    return () => clearTimeout(t);
  }, [filterSku]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    if (!openMenuId) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, perPage, storeName, sortBy: sortConfig.key, sortDir: sortConfig.dir };
      if (filterTag)         params.tag    = filterTag;
      if (debouncedSearch)   params.search = debouncedSearch;
      if (debouncedSku)      params.sku    = debouncedSku;
      if (filterSeller)      params.seller = filterSeller;
      if (filterStatus !== "all") params.status = filterStatus;
      const { data } = await api.get("/links", { params });
      setLinks(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, storeName, filterTag, debouncedSearch, debouncedSku, filterSeller, filterStatus, sortConfig]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  function resetPage() { setPage(1); }
  function handleFilterStatus(v) { setFilterStatus(v); resetPage(); }
  function handleFilterTag(v)    { setFilterTag(v);    resetPage(); }

  function handleSort(key) {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
    resetPage();
  }

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post("/links", newLink);
      setShowAdd(false);
      setNewLink({ link: "", myPrice: "", tag: "" });
      fetchLinks();
      api.get("/links/stats", { params: { storeName } }).then(({ data }) => {
        setAiData(data);
        setWinableSkus((w) => Math.max(1, Math.min(w, data.losingCount || 1)));
      }).catch(() => {});
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
    setOpenMenuId(null);
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

  function handleDelete(id) {
    setOpenMenuId(null);
    setConfirmDialog({
      title: "Remover link",
      message: "O link será removido permanentemente.",
      confirmLabel: "Remover",
      onConfirm: async () => {
        await api.delete(`/links/${id}`);
        setConfirmDialog(null);
        fetchLinks();
        api.get("/links/stats", { params: { storeName } }).then(({ data }) => {
          setAiData(data);
          setWinableSkus((w) => Math.max(1, Math.min(w, data.losingCount || 1)));
        }).catch(() => {});
      },
    });
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
        decoder.decode(value);
      }
      fetchLinks();
      api.get("/links/stats", { params: { storeName } }).then(({ data }) => {
        setAiData(data);
        setWinableSkus((w) => Math.max(1, Math.min(w, data.losingCount || 1)));
      }).catch(() => {});
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
    neutral: "text-gray-500 bg-gray-50",
  };
  const statusIcons = { winning: TrendingUp, losing: TrendingDown, neutral: Minus };

  const hasFilters = filterStatus !== "all" || filterTag !== "" || filterSearch !== "" || filterSku !== "" || filterSeller !== "";

  // Header de coluna clicável
  function SortableHeader({ col, label, className = "" }) {
    const active = sortConfig.key === col;
    return (
      <th
        onClick={() => handleSort(col)}
        className={`cursor-pointer select-none px-4 py-3 font-medium text-gray-500 hover:text-gray-700 ${className}`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {active ? (
            sortConfig.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
          ) : (
            <span className="opacity-0 group-hover:opacity-30"><ChevronDown size={12} /></span>
          )}
        </span>
      </th>
    );
  }

  return (
    <div className="mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 size={22} className="text-brand-600" />
            Links
          </h1>
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

      {/* Seção IA */}
      <AISection
        aiData={aiData}
        scenario={scenario}
        setScenario={setScenario}
        winableSkus={winableSkus}
        setWinableSkus={setWinableSkus}
      />

      {/* Barra de Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
        {/* Busca por título */}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={filterSearch}
            onChange={(e) => { setFilterSearch(e.target.value); resetPage(); }}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
          />
          {filterSearch && (
            <button onClick={() => { setFilterSearch(""); resetPage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Busca por SKU */}
        <div className="relative min-w-[140px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar SKU..."
            value={filterSku}
            onChange={(e) => { setFilterSku(e.target.value); resetPage(); }}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
          />
          {filterSku && (
            <button onClick={() => { setFilterSku(""); resetPage(); }}
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

        {/* Filtro Vendedor */}
        {availableSellers.length > 0 && (
          <select
            value={filterSeller}
            onChange={(e) => { setFilterSeller(e.target.value); resetPage(); }}
            className="px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:border-brand-400 outline-none cursor-pointer">
            <option value="">Todos os Vendedores</option>
            {availableSellers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {/* Limpar filtros */}
        {hasFilters && (
          <button
            onClick={() => {
              setFilterStatus("all");
              setFilterTag("");
              setFilterSearch("");
              setFilterSku("");
              setFilterSeller("");
              resetPage();
            }}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={12} /> Limpar
          </button>
        )}
      </div>

      <AddLinkModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        newLink={newLink}
        setNewLink={setNewLink}
        onSubmit={handleAdd}
        adding={adding}
      />

      <EditLinkModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        editLink={editLink}
        editMyPrice={editMyPrice}
        setEditMyPrice={setEditMyPrice}
        editTags={editTags}
        setEditTags={setEditTags}
        onSave={handleEditSave}
        saving={editSaving}
      />

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : links.length === 0 ? (
        <div className="text-center py-12">
          {hasFilters ? (
            <>
              <p className="text-gray-400 mb-2">Nenhum resultado para os filtros aplicados</p>
              <button
                onClick={() => {
                  setFilterStatus("all"); setFilterTag(""); setFilterSearch("");
                  setFilterSku(""); setFilterSeller(""); resetPage();
                }}
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
                  <th className="text-left px-4 py-3 font-medium text-gray-500">SKU</th>
                  <SortableHeader col="nowPrice" label="Preço Atual" className="text-right" />
                  <th className="text-left px-4 py-3 font-medium text-gray-500 min-w-[160px]">Histórico</th>
                  <SortableHeader col="myPrice" label="Meu Preço" className="text-right" />
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => {
                  const status = priceStatus(link);
                  const StatusIcon = statusIcons[status];
                  const isOnline = link.status === "InStock";

                  // Últimas 2 entradas do histórico
                  const hist = (link.history || []).slice(-2);

                  // Diferencial %: base = meu preço
                  const percentDiff = link.myPrice && link.nowPrice
                    ? ((link.myPrice - link.nowPrice) / link.myPrice) * 100
                    : null;

                  return (
                    <tr key={link._id} className="border-b border-gray-50 hover:bg-gray-50/50">

                      {/* Produto */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {link.image ? (
                            <img src={link.image} alt=""
                              className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <a
                              href={link.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-gray-900 hover:text-brand-600 hover:underline flex items-center gap-1 break-words"
                              title={link.name || "Sem título"}>
                              <span className="line-clamp-2 max-w-[220px]">{link.name || "Sem título"}</span>
                              <ExternalLink size={11} className="flex-shrink-0 text-gray-300" />
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
                                <span key={t} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3">
                        {link.sku ? (
                          <a
                            href={`https://lista.mercadolivre.com.br/${link.sku}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors">
                            {link.sku}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Preço Atual */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-medium text-gray-900">
                          R$ {link.nowPrice?.toFixed(2) ?? "—"}
                        </span>
                        {link.dateMl && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Desde {format(new Date(link.dateMl), "d 'de' MMM", { locale: ptBR })}
                          </p>
                        )}
                      </td>

                      {/* Histórico — pills com data */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto max-w-[200px]">
                          {hist.length > 0 ? (
                            hist.map((h, i) => {
                              const daysAgo = h.updatedAt
                                ? differenceInDays(new Date(), new Date(h.updatedAt))
                                : null;
                              return (
                                <span key={i}
                                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap font-mono">
                                  R$ {h.price?.toFixed(2)}
                                  {h.updatedAt && (
                                    <span className="text-gray-400 font-sans">
                                      {format(new Date(h.updatedAt), "dd/MM")}
                                      {daysAgo !== null ? ` · ${daysAgo}d` : ""}
                                    </span>
                                  )}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </div>
                      </td>

                      {/* Meu Preço + diferencial */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-gray-900">
                          R$ {link.myPrice?.toFixed(2) ?? "—"}
                        </span>
                        {percentDiff !== null && (
                          <p className={`text-xs mt-0.5 font-medium ${percentDiff > 0 ? "text-red-500" : "text-emerald-600"}`}>
                            {percentDiff > 0 ? "+" : ""}{percentDiff.toFixed(1)}%
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline ? "bg-emerald-400" : "bg-gray-300"}`} />
                          <StatusIcon size={11} />
                          {status === "winning" ? "Ganhando" : status === "losing" ? "Perdendo" : "Neutro"}
                        </span>
                      </td>

                      {/* Ações — menu ⋮ */}
                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-block" ref={openMenuId === link._id ? menuRef : null}>
                          <button
                            onClick={() => setOpenMenuId((prev) => prev === link._id ? null : link._id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
                            <MoreVertical size={15} />
                          </button>

                          {openMenuId === link._id && (
                            <div className="absolute right-0 top-full mt-1 z-30 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-left">
                              {/* Info */}
                              <div className="px-3 py-2 border-b border-gray-50">
                                {link.updatedAt && (
                                  <p className="text-xs text-gray-400">
                                    Atualizado: {format(new Date(link.updatedAt), "dd/MM/yy HH:mm")}
                                  </p>
                                )}
                                {link.sku && (
                                  <p className="text-xs text-gray-500 font-mono mt-0.5">MLB: {link.sku}</p>
                                )}
                                {link.ratingSeller && (
                                  <p className="text-xs text-gray-400 mt-0.5">Reputação: {link.ratingSeller}</p>
                                )}
                              </div>
                              {/* Ações */}
                              <button
                                onClick={() => openEdit(link)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <Pencil size={13} className="text-gray-400" />
                                Editar SKU / Preço
                              </button>
                              <button
                                onClick={() => handleDelete(link._id)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50">
                                <Trash2 size={13} />
                                Excluir do acompanhamento
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
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

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={confirmDialog?.onConfirm}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  );
}