import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, RefreshCw, Trash2, Tag, TrendingUp, TrendingDown, Minus,
  Search, X, Link2, ExternalLink, ChevronUp, ChevronDown, Info,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../services/api";
import { notifyError } from "../utils/notify.js";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { AISection }      from "../components/links/AISection";
import { AddLinkModal }   from "../components/links/AddLinkModal";
import { EditLinkModal }  from "../components/links/EditLinkModal";
import { CatalogSuggestModal } from "../components/links/CatalogSuggestModal";
import { PageHeader, Button } from "../components/ui";

const QK = {
  links: (filters) => ["links", filters],
  tags: () => ["links-tags"],
  sellers: () => ["links-sellers"],
  stats: () => ["links-stats"],
};

// ─── Página principal ────────────────────────────────────────────────────────

export default function LinksPage() {
  const { user } = useAuth();
  const { hasMeliAccount } = useNotifications();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const storeName = "mercadolivre";
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
  // Anúncio fora de catálogo: { linkId } (link existente) ou { url } (recusado no cadastro)
  const [catalogTarget, setCatalogTarget] = useState(null);

  // Filtros
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTag, setFilterTag] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterSku, setFilterSku] = useState("");
  const [filterSeller, setFilterSeller] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedSku, setDebouncedSku] = useState("");

  // Ordenação
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", dir: "desc" });

  // IA
  const [scenario, setScenario] = useState("conservative");
  const [winableSkus, setWinableSkus] = useState(1);

  const perPage = 20;
  const maxLinks = user?.planConfig?.maxLinks || 10;

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

  const filters = { page, perPage, storeName, sortBy: sortConfig.key, sortDir: sortConfig.dir,
    tag: filterTag || undefined, search: debouncedSearch || undefined, sku: debouncedSku || undefined,
    seller: filterSeller || undefined, status: filterStatus !== "all" ? filterStatus : undefined,
  };

  const { data: linksData, isLoading: loading } = useQuery({
    queryKey: QK.links(filters),
    queryFn: () => api.get("/links", { params: filters }).then(r => r.data),
    keepPreviousData: true,
  });
  const links = linksData?.data ?? [];
  const total = linksData?.total ?? 0;

  const { data: availableTags = [] } = useQuery({
    queryKey: QK.tags(),
    queryFn: () => api.get("/links/tags").then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const { data: availableSellers = [] } = useQuery({
    queryKey: QK.sellers(),
    queryFn: () => api.get("/links/sellers").then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  // Cadastro/atualização de links usa a API do ML → exige ao menos 1 conta conectada
  const noMeliAccount = !hasMeliAccount;

  const { data: aiData } = useQuery({
    queryKey: QK.stats(),
    queryFn: () => api.get("/links/stats", { params: { storeName } }).then(r => r.data),
  });

  useEffect(() => {
    if (aiData) setWinableSkus((w) => Math.max(1, Math.min(w, aiData.losingCount || 1)));
  }, [aiData]);

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
      queryClient.invalidateQueries({ queryKey: ["links"] });
      queryClient.invalidateQueries({ queryKey: QK.stats() });
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "FORBIDDEN" || code === "UNSUPPORTED_URL") {
        setShowAdd(false);
        setCatalogTarget({ url: newLink.link });
      } else {
        notifyError(err.response?.data?.error || "Erro ao adicionar link");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleCatalogSelect(suggestion) {
    if (catalogTarget?.linkId) {
      await api.post(`/links/${catalogTarget.linkId}/catalog`, { productId: suggestion.id });
    } else {
      await api.post("/links", { ...newLink, link: suggestion.permalink });
      setNewLink({ link: "", myPrice: "", tag: "" });
    }
    queryClient.invalidateQueries({ queryKey: ["links"] });
    queryClient.invalidateQueries({ queryKey: QK.stats() });
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
      await api.put(`/links/${editLink._id}`, {
        myPrice: Number(editMyPrice) || 0,
        tags,
      });
      queryClient.invalidateQueries({ queryKey: ["links"] });
      setEditOpen(false);
      setEditLink(null);
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao salvar");
    } finally {
      setEditSaving(false);
    }
  }

  function handleDelete(id) {
    setConfirmDialog({
      title: "Remover link",
      message: "O link será removido permanentemente.",
      confirmLabel: "Remover",
      onConfirm: async () => {
        await api.delete(`/links/${id}`);
        setConfirmDialog(null);
        queryClient.invalidateQueries({ queryKey: ["links"] });
        queryClient.invalidateQueries({ queryKey: QK.stats() });
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
      queryClient.invalidateQueries({ queryKey: ["links"] });
      queryClient.invalidateQueries({ queryKey: QK.stats() });
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
    winning: "text-neon bg-neon/10",
    losing:  "text-danger bg-danger/10",
    neutral: "text-fg-muted bg-ink/[0.03]",
  };
  const statusIcons = { winning: TrendingUp, losing: TrendingDown, neutral: Minus };

  const hasFilters = filterStatus !== "all" || filterTag !== "" || filterSearch !== "" || filterSku !== "" || filterSeller !== "";

  // Header de coluna clicável
  function SortableHeader({ col, label, className = "" }) {
    const active = sortConfig.key === col;
    return (
      <th
        onClick={() => handleSort(col)}
        className={`cursor-pointer select-none px-4 py-3 font-medium text-fg-muted hover:text-fg/90 ${className}`}
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
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        icon={Link2}
        title="Links"
        description={<><span className="num text-fg">{total}</span> de <span className="num">{maxLinks}</span> links utilizados</>}
        actions={
          <>
            <Button variant="secondary" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Atualizando..." : "Atualizar"}
            </Button>
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Adicionar
            </Button>
          </>
        }
      />

      {/* Aviso: conta ML necessária */}
      {noMeliAccount && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <Info size={16} className="shrink-0 text-warn" />
          <span>
            É necessário ter <strong>ao menos 1 conta do Mercado Livre conectada</strong> para cadastrar e atualizar links.
            Os dados dos produtos são consultados pela API oficial do Mercado Livre.
          </span>
          <Link to="/meli"
            className="sm:ml-auto shrink-0 px-3 py-1.5 rounded-lg bg-warn/15 border border-warn/40 text-warn text-xs font-semibold hover:bg-warn/25 transition-colors">
            Conectar conta
          </Link>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-1.5 bg-ink/[0.06] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all bg-gradient-to-r from-brandSolid-500 to-glow shadow-[0_0_12px_rgb(var(--glow)/0.7)]"
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
      <div className="flex flex-wrap gap-3 mb-4 glass border border-line/10 rounded-xl p-3 shadow-sm">
        {/* Busca por título */}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={filterSearch}
            onChange={(e) => { setFilterSearch(e.target.value); resetPage(); }}
            className="field w-full !pl-9 !pr-8"
          />
          {filterSearch && (
            <button onClick={() => { setFilterSearch(""); resetPage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-dim hover:text-fg-muted">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Busca por SKU */}
        <div className="relative min-w-[140px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar SKU..."
            value={filterSku}
            onChange={(e) => { setFilterSku(e.target.value); resetPage(); }}
            className="field w-full !pl-9 !pr-8"
          />
          {filterSku && (
            <button onClick={() => { setFilterSku(""); resetPage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-dim hover:text-fg-muted">
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
                  ? value === "winning" ? "bg-neon/15 text-neon ring-1 ring-inset ring-neon/40"
                    : value === "losing"  ? "bg-danger/15 text-danger ring-1 ring-inset ring-danger/40"
                    : "bg-brandSolid-500/20 text-fg ring-1 ring-inset ring-brandSolid-400/50 shadow-[0_0_14px_-6px_rgb(30_123_255/0.9)]"
                  : "bg-ink/[0.06] text-fg-muted hover:bg-ink/10"
              }`}>
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Filtro Tag */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Tag size={13} className="text-fg-dim flex-shrink-0" />
            <select
              value={filterTag}
              onChange={(e) => handleFilterTag(e.target.value)}
              className="field !w-auto !pl-2 !pr-7 cursor-pointer">
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
            className="field !w-auto !pl-2 !pr-7 cursor-pointer">
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
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-fg-muted hover:text-fg/90 hover:bg-ink/[0.06] rounded-lg transition-colors">
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
        <div className="text-center py-12 text-fg-dim">Carregando...</div>
      ) : links.length === 0 ? (
        <div className="text-center py-12">
          {hasFilters ? (
            <>
              <p className="text-fg-dim mb-2">Nenhum resultado para os filtros aplicados</p>
              <button
                onClick={() => {
                  setFilterStatus("all"); setFilterTag(""); setFilterSearch("");
                  setFilterSku(""); setFilterSeller(""); resetPage();
                }}
                className="text-brandSolid-300 text-sm font-medium hover:underline">
                Limpar filtros
              </button>
            </>
          ) : (
            <>
              <p className="text-fg-dim mb-2">Nenhum link cadastrado</p>
              <button onClick={() => setShowAdd(true)}
                className="text-brandSolid-300 text-sm font-medium hover:underline">
                Adicionar primeiro link
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="glass rounded-xl border border-line/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/10">
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">Produto</th>
                  <th className="text-left px-4 py-3 font-medium text-fg-muted">SKU</th>
                  <SortableHeader col="nowPrice" label="Preço Atual" className="text-right" />
                  <th className="text-left px-4 py-3 font-medium text-fg-muted min-w-[160px]">Histórico</th>
                  <SortableHeader col="myPrice" label="Meu Preço" className="text-right" />
                  <th className="text-center px-4 py-3 font-medium text-fg-muted">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-fg-muted">Ações</th>
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
                    <tr key={link._id} className="border-b border-line/[0.06] hover:bg-ink/[0.02]">

                      {/* Produto */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {link.image ? (
                            <img src={link.image} alt=""
                              className="w-10 h-10 rounded-lg object-cover bg-ink/[0.06] flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-ink/[0.06] flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <a
                              href={link.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-fg hover:text-brandSolid-300 hover:underline flex items-center gap-1 break-words"
                              title={link.name || "Sem título"}>
                              <span className="line-clamp-3 max-w-[220px]">{link.name || "Sem título"}</span>
                              <ExternalLink size={11} className="flex-shrink-0 text-fg-dim/60" />
                            </a>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {link.seller && (
                                <span className="text-xs text-fg-dim">{link.seller}</span>
                              )}
                              {link.full && (
                                <span className="text-xs bg-neon/10 text-neon px-1.5 py-0.5 rounded font-medium">
                                  FULL
                                </span>
                              )}
                              {link.apiBlocked && (
                                <button
                                  onClick={() => setCatalogTarget({ linkId: link._id })}
                                  title="O Mercado Livre não libera este anúncio pela API. Escolha um produto de catálogo equivalente."
                                  className="text-xs bg-warn/10 text-warn border border-warn/30 px-1.5 py-0.5 rounded font-medium hover:bg-warn/15">
                                  Fora de catálogo · escolher catálogo
                                </button>
                              )}
                              {link.tags?.map((t) => (
                                <span key={t} className="text-xs bg-ink/[0.06] text-fg-muted px-1.5 py-0.5 rounded">
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 transition-colors">
                            {link.sku}
                          </a>
                        ) : (
                          <span className="text-xs text-fg-dim/60">—</span>
                        )}
                      </td>

                      {/* Preço Atual */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-medium text-fg">
                          R$ {link.nowPrice?.toFixed(2) ?? "—"}
                        </span>
                        {link.dateMl && (
                          <p className="text-xs text-fg-dim mt-0.5">
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
                                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-ink/[0.06] text-fg-muted whitespace-nowrap font-mono">
                                  R$ {h.price?.toFixed(2)}
                                  {h.updatedAt && (
                                    <span className="text-fg-dim font-sans">
                                      {format(new Date(h.updatedAt), "dd/MM")}
                                      {daysAgo !== null ? ` · ${daysAgo}d` : ""}
                                    </span>
                                  )}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-fg-dim/60">—</span>
                          )}
                        </div>
                      </td>

                      {/* Meu Preço + diferencial */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-fg">
                          R$ {link.myPrice?.toFixed(2) ?? "—"}
                        </span>
                        {percentDiff !== null && (
                          <p className={`text-xs mt-0.5 font-medium ${percentDiff > 0 ? "text-danger" : "text-neon"}`}>
                            {percentDiff > 0 ? "+" : ""}{percentDiff.toFixed(1)}%
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline ? "bg-neon shadow-[0_0_6px_rgb(var(--neon))]" : "bg-ink/15"}`} />
                          <StatusIcon size={11} />
                          {status === "winning" ? "Ganhando" : status === "losing" ? "Perdendo" : "Neutro"}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEdit(link)}
                            title="Editar SKU / Preço"
                            className="p-1.5 hover:bg-ink/[0.06] rounded-lg text-fg-dim hover:text-fg/90">
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(link._id)}
                            title="Excluir do acompanhamento"
                            className="p-1.5 hover:bg-danger/10 rounded-lg text-fg-dim hover:text-danger">
                            <Trash2 size={15} />
                          </button>
                        </div>
                        {link.updatedAt && (
                          <p className="text-xs text-fg-dim mt-0.5 whitespace-nowrap"
                            title={link.ratingSeller ? `Reputação: ${link.ratingSeller}` : undefined}>
                            Atualizado {format(new Date(link.updatedAt), "dd/MM HH:mm")}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {total > perPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-line/10">
              <span className="text-sm text-fg-muted">
                Página {page} de {Math.ceil(total / perPage)}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-ink/[0.03] disabled:opacity-40">
                  Anterior
                </button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page * perPage >= total}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-ink/[0.03] disabled:opacity-40">
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <CatalogSuggestModal
        isOpen={!!catalogTarget}
        onClose={() => setCatalogTarget(null)}
        linkId={catalogTarget?.linkId}
        url={catalogTarget?.url}
        onSelect={handleCatalogSelect}
      />

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