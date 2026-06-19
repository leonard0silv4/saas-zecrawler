import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, RefreshCcw } from "lucide-react";
import api from "../services/api";
import { apiErrorMessage, notifyError, notifyWarning } from "../utils/notify.js";
import { useNotifications } from "../contexts/NotificationContext";
import { useSmartSuggestions } from "../hooks/useSmartSuggestions";
import ConfirmDialog from "../components/ConfirmDialog";
import { AccountSelector } from "../components/meli-messages/AccountSelector";
import { ConversationList } from "../components/meli-messages/ConversationList";
import { ChatThread } from "../components/meli-messages/ChatThread";
import { TemplateModal } from "../components/meli-messages/TemplateModal";
import { ProductSearchModal } from "../components/meli-messages/ProductSearchModal";
import { ConfirmReplyModal } from "../components/meli-messages/ConfirmReplyModal";

// ─── Query keys ───────────────────────────────────────────────────────────────
const QK = {
  accounts:      ()             => ["meli-accounts"],
  templates:     ()             => ["meli-templates"],
  questions:     (userId, status) => ["questions", userId, status],
  buyerThread:   (fromId, userId) => ["buyer-thread", fromId, userId],
  productDetail: (itemId)       => ["product-detail", itemId],
};

// TTL curto do prefetch das outras lojas (troca de loja instantânea)
const PREFETCH_STALE_TIME = 5 * 60_000;  // 5 min — evita re-prefetch redundante
const PREFETCH_GC_TIME    = 10 * 60_000; // 10 min — mantém o cache das lojas inativas

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function MeliMessagesPage() {
  const { hasDotForUserId, fetchUnread, lastMeliQuestionEvent } = useNotifications();
  const queryClient = useQueryClient();

  // ─── UI state ────────────────────────────────────────────────────────────────
  const [selectedUserId, setSelectedUserId] = useState("");
  const [statusFilter, setStatusFilter] = useState("UNANSWERED");
  const [sortOrder, setSortOrder] = useState("desc");
  const [threadSortOrder, setThreadSortOrder] = useState("asc");
  const [syncing, setSyncing] = useState(false);

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [selectedConversationFromId, setSelectedConversationFromId] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Template CRUD state
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingTemplateContent, setEditingTemplateContent] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState(null);

  // Modals
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [deleteQuestionModal, setDeleteQuestionModal] = useState(null);
  const [confirmReplyModal, setConfirmReplyModal] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState(false);

  // Hashtag autocomplete
  const replyTextareaRef = useRef(null);
  const hashAnchorRef    = useRef(null);
  const [hashQuery, setHashQuery] = useState("");
  const [hashDropdownOpen, setHashDropdownOpen] = useState(false);
  const [hashDropdownIndex, setHashDropdownIndex] = useState(0);

  // ─── Server state (React Query) ───────────────────────────────────────────────

  const { data: accounts = [] } = useQuery({
    queryKey: QK.accounts(),
    queryFn: () => api.get("/meli/accounts").then(r => r.data),
    staleTime: 5 * 60_000,
    onSuccess: (data) => {
      if (!selectedUserId && data.length > 0) setSelectedUserId(String(data[0].user_id));
    },
  });

  // Auto-select first account on first load
  useEffect(() => {
    if (!selectedUserId && accounts.length > 0) setSelectedUserId(String(accounts[0].user_id));
  }, [accounts, selectedUserId]);

  const { data: templates = [] } = useQuery({
    queryKey: QK.templates(),
    queryFn: () => api.get("/meli/messages/templates").then(r => Array.isArray(r.data) ? r.data : []),
    staleTime: 5 * 60_000,
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: QK.questions(selectedUserId, statusFilter),
    queryFn: () =>
      api.get("/meli/messages/questions", {
        params: { user_id: selectedUserId, status: statusFilter, page: 1, limit: 50 },
      }).then(r => r.data?.items ?? []),
    enabled: !!selectedUserId,
    staleTime: 30_000,
    refetchInterval: 5 * 60_000,
  });

  // Prefetch em background das mensagens das OUTRAS lojas (cache p/ troca instantânea)
  useEffect(() => {
    if (!selectedUserId || accounts.length < 2) return;

    const others = accounts.filter(a => String(a.user_id) !== String(selectedUserId));

    others.forEach((acc) => {
      const userId = String(acc.user_id);
      queryClient.prefetchQuery({
        queryKey: QK.questions(userId, statusFilter),
        queryFn: () =>
          api.get("/meli/messages/questions", {
            params: { user_id: userId, status: statusFilter, page: 1, limit: 50 },
          }).then(r => r.data?.items ?? []),
        staleTime: PREFETCH_STALE_TIME,
        gcTime: PREFETCH_GC_TIME,
      });
    });
  }, [accounts, selectedUserId, statusFilter, queryClient]);

  const { data: buyerThread = [], isLoading: loadingBuyerThread } = useQuery({
    queryKey: QK.buyerThread(selectedConversationFromId, selectedUserId),
    queryFn: () =>
      api.get("/meli/messages/questions/buyer-thread", {
        params: { from_id: selectedConversationFromId, user_id: selectedUserId },
      }).then(r => r.data?.items ?? []),
    enabled: !!selectedConversationFromId && !!selectedUserId,
    staleTime: 10_000,
  });

  // Product details — one cache entry per itemId, shared across conversations
  const uniqueItemIds = useMemo(
    () => [...new Set(buyerThread.map(q => q.item_id).filter(Boolean))],
    [buyerThread]
  );

  const productQueries = useQueries({
    queries: uniqueItemIds.map(itemId => ({
      queryKey: QK.productDetail(itemId),
      queryFn: () =>
        api.get(`/meli/items/${itemId}/details`).then(r => r.data).catch(() => null),
      staleTime: 5 * 60_000,
      enabled: !!itemId,
    })),
  });

  const listingProductsMap = useMemo(() => {
    const map = new Map();
    productQueries.forEach((q, i) => { if (q.data) map.set(uniqueItemIds[i], q.data); });
    return map;
  }, [productQueries, uniqueItemIds]);

  // Send reply mutation with optimistic update
  const replyMutation = useMutation({
    mutationFn: ({ questionId, text }) =>
      api.post(`/meli/messages/questions/${questionId}/reply`, { text }),

    onMutate: async ({ questionId, text }) => {
      const threadKey = QK.buyerThread(selectedConversationFromId, selectedUserId);
      const questionsKey = QK.questions(selectedUserId, statusFilter);
      await queryClient.cancelQueries({ queryKey: threadKey });
      const prevThread = queryClient.getQueryData(threadKey);
      queryClient.setQueryData(threadKey, (old = []) =>
        old.map(q =>
          q.question_id === questionId
            ? { ...q, status: "ANSWERED", answer_text: text, answer_date_created: new Date().toISOString(), answered_by: "manual" }
            : q
        )
      );
      queryClient.setQueryData(questionsKey, (old = []) =>
        old.map(q =>
          q.question_id === questionId
            ? { ...q, status: "ANSWERED", answer_text: text }
            : q
        )
      );
      return { prevThread, threadKey };
    },

    onError: (err, _vars, ctx) => {
      if (ctx?.prevThread) queryClient.setQueryData(ctx.threadKey, ctx.prevThread);
      notifyError(apiErrorMessage(err, "Erro ao enviar resposta manual"));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QK.questions(selectedUserId, statusFilter) });
      queryClient.invalidateQueries({ queryKey: QK.buyerThread(selectedConversationFromId, selectedUserId) });
      fetchUnread();
    },
  });

  // ─── Derived values ───────────────────────────────────────────────────────────
  const conversations = useMemo(() => {
    const map = new Map();
    for (const q of questions) {
      if (!map.has(q.from_id)) {
        map.set(q.from_id, {
          from_id: q.from_id,
          from_nickname: q.from_nickname,
          questions: [],
          lastDate: q.date_created,
          unansweredCount: 0,
          lastQuestionText: q.text,
          item_title: q.item_title,
        });
      }
      const conv = map.get(q.from_id);
      conv.questions.push(q);
      if (q.date_created > conv.lastDate) {
        conv.lastDate = q.date_created;
        conv.lastQuestionText = q.text;
        conv.item_title = q.item_title;
      }
      if (q.status === "UNANSWERED") conv.unansweredCount++;
    }
    const sorted = [...map.values()].sort((a, b) =>
      sortOrder === "desc"
        ? b.lastDate > a.lastDate ? 1 : -1
        : a.lastDate > b.lastDate ? 1 : -1
    );
    return sorted;
  }, [questions, sortOrder]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => String(c.from_id) === String(selectedConversationFromId)) || null,
    [conversations, selectedConversationFromId]
  );

  const activeQuestion = useMemo(() => {
    if (!selectedConversation) return null;
    return (
      selectedConversation.questions.find((q) => q.status === "UNANSWERED") ||
      selectedConversation.questions[selectedConversation.questions.length - 1] ||
      null
    );
  }, [selectedConversation]);

  const smartSuggestions = useSmartSuggestions(activeQuestion?.text, selectedUserId);

  const filteredProducts = useMemo(() => {
    const s = productSearch.trim().toLowerCase();
    if (!s) return products.slice(0, 8);
    return products.filter((p) => String(p.title || p.SKU || "").toLowerCase().includes(s)).slice(0, 8);
  }, [products, productSearch]);

  const hashSuggestions = useMemo(() => {
    if (!hashDropdownOpen) return [];
    return templates.filter((t) => t.isActive && t.name.toLowerCase().includes(hashQuery)).slice(0, 6);
  }, [hashDropdownOpen, hashQuery, templates]);

  const selectedAccount = accounts.find((a) => String(a.user_id) === selectedUserId);

  // ─── Effects ─────────────────────────────────────────────────────────────────

  // Reset conversation selection when account/filter changes
  useEffect(() => {
    if (!selectedUserId) return;
    setSelectedConversationFromId(null);
    setReplyText("");
    loadProducts("");
  }, [selectedUserId, statusFilter]);

  // Auto-select first conversation
  useEffect(() => {
    if (conversations.length === 0) { setSelectedConversationFromId(null); return; }
    setSelectedConversationFromId((prev) => {
      if (prev != null && conversations.some((c) => String(c.from_id) === String(prev))) return prev;
      return conversations[0]?.from_id ?? null;
    });
  }, [conversations]);

  // SSE → invalidate queries instead of manual state updates
  useEffect(() => {
    if (!lastMeliQuestionEvent || !selectedUserId) return;
    if (
      lastMeliQuestionEvent.user_id &&
      String(lastMeliQuestionEvent.user_id) !== String(selectedUserId)
    ) return;

    queryClient.invalidateQueries({ queryKey: QK.questions(selectedUserId, statusFilter) });
    if (selectedConversationFromId && String(lastMeliQuestionEvent.from_id) === String(selectedConversationFromId)) {
      queryClient.invalidateQueries({ queryKey: QK.buyerThread(selectedConversationFromId, selectedUserId) });
    }
  }, [lastMeliQuestionEvent, selectedUserId, statusFilter, selectedConversationFromId, queryClient]);

  // Product search debounce
  useEffect(() => {
    if (!selectedUserId || !accounts.length) return;
    const handle = setTimeout(() => loadProducts(productSearch), 300);
    return () => clearTimeout(handle);
  }, [selectedUserId, productSearch, accounts.length]);

  // Hashtag dropdown: close on outside click
  useEffect(() => {
    if (!hashDropdownOpen) return;
    function close(e) {
      if (hashAnchorRef.current && !hashAnchorRef.current.contains(e.target)) setHashDropdownOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [hashDropdownOpen]);

  // ─── Data fetching helpers (non-cached, local UI) ─────────────────────────────
  async function loadProducts(query = "") {
    if (!accounts.length) { setProducts([]); return; }
    setLoadingProducts(true);
    try {
      const { data } = await api.get("/meli/products/autocomplete", { params: { q: query } });
      setProducts(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  function handleSelectConversation(fromId) {
    setSelectedConversationFromId(fromId);
    setReplyText("");
  }

  function applySuggestion(text) {
    setReplyText((prev) => (prev.trim() ? `${prev.trimEnd()}\n${text}` : text));
    requestAnimationFrame(() => {
      const ta = replyTextareaRef.current;
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    });
  }

  function insertProductLink(permalink) {
    if (!permalink) return;
    const text = `${getGreeting()}! Aqui está o anúncio que você procura. ${permalink}`;
    const ta = replyTextareaRef.current;
    if (!ta) { setReplyText((prev) => `${prev}${prev ? "\n" : ""}${text}`); setProductSearch(""); return; }
    const start = ta.selectionStart ?? replyText.length;
    const end   = ta.selectionEnd   ?? replyText.length;
    setReplyText(`${replyText.slice(0, start)}${text}${replyText.slice(end)}`);
    setProductSearch("");
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length); });
  }

  function insertTemplateInReply(content) {
    const c = String(content || "").trim();
    if (!c) return;
    const ta = replyTextareaRef.current;
    if (!ta) { setReplyText((prev) => `${prev}${prev ? "\n\n" : ""}${c}`); return; }
    const start = ta.selectionStart ?? replyText.length;
    const end   = ta.selectionEnd   ?? replyText.length;
    const spacer = replyText && start > 0 ? "\n\n" : "";
    setReplyText(`${replyText.slice(0, start)}${spacer}${c}${replyText.slice(end)}`);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + spacer.length + c.length, start + spacer.length + c.length); });
  }

  function handleReplyChange(e) {
    const val = e.target.value;
    setReplyText(val);
    const prefix = val.slice(0, e.target.selectionStart);
    const match = /(^|\s)#(\w*)$/.exec(prefix);
    if (match) { setHashQuery(match[2].toLowerCase()); setHashDropdownOpen(true); setHashDropdownIndex(0); }
    else { setHashDropdownOpen(false); setHashQuery(""); }
  }

  function handleReplyKeyDown(e) {
    if (!hashDropdownOpen || !hashSuggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHashDropdownIndex((i) => (i + 1) % hashSuggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHashDropdownIndex((i) => (i - 1 + hashSuggestions.length) % hashSuggestions.length); }
    else if (e.key === "Enter" || e.key === "Tab") { if (hashSuggestions[hashDropdownIndex]) { e.preventDefault(); applyHashTemplate(hashSuggestions[hashDropdownIndex]); } }
    else if (e.key === "Escape") { setHashDropdownOpen(false); }
  }

  function applyHashTemplate(template) {
    const ta = replyTextareaRef.current;
    const cursor = ta ? ta.selectionStart : replyText.length;
    const prefix = replyText.slice(0, cursor);
    const match = /(^|\s)(#\w*)$/.exec(prefix);
    if (!match) return;
    const tokenStart = cursor - match[2].length;
    const next = replyText.slice(0, tokenStart) + template.content + replyText.slice(cursor);
    setReplyText(next);
    setHashDropdownOpen(false);
    setHashQuery("");
    requestAnimationFrame(() => {
      if (ta) { ta.focus(); const pos = tokenStart + template.content.length; ta.setSelectionRange(pos, pos); }
    });
  }

  function openConfirmReply() {
    if (!activeQuestion || !replyText.trim()) return;
    setConfirmReplyModal(true);
  }

  function sendManualReply() {
    if (!activeQuestion) return;
    const text = replyText.trim();
    if (!text) { notifyWarning("Digite uma resposta antes de enviar"); return; }
    setReplyText("");
    replyMutation.mutate({ questionId: activeQuestion.question_id, text });
  }

  async function openSelectedQuestionListing() {
    if (!activeQuestion?.item_id) { notifyWarning("A pergunta selecionada não possui item_id"); return; }
    const cached = listingProductsMap.get(activeQuestion.item_id);
    if (cached?.permalink) { window.open(cached.permalink, "_blank", "noopener,noreferrer"); return; }
    try {
      const { data } = await api.get(`/meli/items/${activeQuestion.item_id}/permalink`);
      if (data?.permalink) { window.open(data.permalink, "_blank", "noopener,noreferrer"); return; }
      notifyWarning("Não foi possível localizar o permalink do anúncio");
    } catch (error) {
      if (error.response?.status === 404) notifyWarning("Anúncio não encontrado nas contas conectadas");
      else notifyError(error.response?.data?.error || "Erro ao localizar o anúncio");
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      await api.post("/meli/messages/sync");
      queryClient.invalidateQueries({ queryKey: QK.questions(selectedUserId, statusFilter) });
      fetchUnread();
    } catch (error) {
      notifyError(error.response?.data?.error || "Erro ao sincronizar perguntas");
    } finally {
      setSyncing(false);
    }
  }

  async function createTemplate() {
    const name = newTemplateName.trim(); const content = newTemplateContent.trim();
    if (!name || !content) { notifyWarning("Informe nome e conteúdo do template"); return; }
    setSavingTemplate(true);
    try {
      await api.post("/meli/messages/templates", { name, content, isActive: true });
      setNewTemplateName(""); setNewTemplateContent("");
      queryClient.invalidateQueries({ queryKey: QK.templates() });
    } catch (error) { notifyError(error.response?.data?.error || "Erro ao criar template"); }
    finally { setSavingTemplate(false); }
  }

  async function saveTemplateEdit() {
    const name = editingTemplateName.trim(); const content = editingTemplateContent.trim();
    if (!name || !content) { notifyWarning("Nome e conteúdo são obrigatórios"); return; }
    setSavingTemplate(true);
    try {
      await api.put(`/meli/messages/templates/${editingTemplateId}`, { name, content });
      setEditingTemplateId(null); setEditingTemplateName(""); setEditingTemplateContent("");
      queryClient.invalidateQueries({ queryKey: QK.templates() });
    } catch (error) { notifyError(error.response?.data?.error || "Erro ao atualizar template"); }
    finally { setSavingTemplate(false); }
  }

  function startEditTemplate(template) {
    setEditingTemplateId(template._id);
    setEditingTemplateName(template.name || "");
    setEditingTemplateContent(template.content || "");
  }

  async function deleteTemplate(id) {
    setDeletingTemplateId(id);
    try {
      await api.delete(`/meli/messages/templates/${id}`);
      queryClient.invalidateQueries({ queryKey: QK.templates() });
    } catch (error) { notifyError(error.response?.data?.error || "Erro ao excluir template"); }
    finally { setDeletingTemplateId(null); }
  }

  async function confirmDeleteQuestion() {
    if (!deleteQuestionModal) return;
    setDeletingQuestion(true);
    try {
      await api.delete(`/meli/messages/questions/${deleteQuestionModal.question_id}`);
      setDeleteQuestionModal(null);
      queryClient.invalidateQueries({ queryKey: QK.questions(selectedUserId, statusFilter) });
    } catch (error) {
      notifyError(error.response?.data?.error || "Erro ao excluir pergunta");
    } finally { setDeletingQuestion(false); }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:h-full gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle size={22} className="text-brand-600" />
            Mensagens ML
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Gerencie perguntas, respostas e templates.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: QK.questions(selectedUserId, statusFilter) })}
            disabled={loadingQuestions || !selectedUserId}
            className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium disabled:opacity-50 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200"
          >
            {loadingQuestions ? "Carregando..." : "Atualizar"}
          </button>
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2.5 hover:bg-brand-700 active:bg-brand-800 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCcw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </div>

      {/* Account selector row */}
      <AccountSelector
        accounts={accounts}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
        hasDotForUserId={hasDotForUserId}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        questionsCount={conversations.length}
      />

      {/* Chat grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 lg:flex-1 lg:min-h-0">
        <ConversationList
          conversations={conversations}
          selectedConversationFromId={selectedConversationFromId}
          onSelectConversation={handleSelectConversation}
          loadingQuestions={loadingQuestions}
          selectedUserId={selectedUserId}
          selectedAccount={selectedAccount}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />
        <ChatThread
          selectedConversation={selectedConversation}
          activeQuestion={activeQuestion}
          listingProductsMap={listingProductsMap}
          buyerThread={buyerThread}
          loadingBuyerThread={loadingBuyerThread}
          replyText={replyText}
          hashAnchorRef={hashAnchorRef}
          replyTextareaRef={replyTextareaRef}
          hashDropdownOpen={hashDropdownOpen}
          hashSuggestions={hashSuggestions}
          hashDropdownIndex={hashDropdownIndex}
          smartSuggestions={smartSuggestions}
          sendingReply={replyMutation.isPending}
          handleReplyChange={handleReplyChange}
          handleReplyKeyDown={handleReplyKeyDown}
          applySuggestion={applySuggestion}
          applyHashTemplate={applyHashTemplate}
          onRequestSend={openConfirmReply}
          openSelectedQuestionListing={openSelectedQuestionListing}
          setDeleteQuestionModal={setDeleteQuestionModal}
          onOpenTemplates={() => setTemplateModalOpen(true)}
          onOpenProducts={() => setProductModalOpen(true)}
          threadSortOrder={threadSortOrder}
          setThreadSortOrder={setThreadSortOrder}
          selectedAccount={selectedAccount}
        />
      </div>

      {/* Modals */}
      <TemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        templates={templates}
        onInsert={insertTemplateInReply}
        newTemplateName={newTemplateName} setNewTemplateName={setNewTemplateName}
        newTemplateContent={newTemplateContent} setNewTemplateContent={setNewTemplateContent}
        createTemplate={createTemplate} savingTemplate={savingTemplate}
        editingTemplateId={editingTemplateId} setEditingTemplateId={setEditingTemplateId}
        editingTemplateName={editingTemplateName} setEditingTemplateName={setEditingTemplateName}
        editingTemplateContent={editingTemplateContent} setEditingTemplateContent={setEditingTemplateContent}
        saveTemplateEdit={saveTemplateEdit}
        deleteTemplate={deleteTemplate} deletingTemplateId={deletingTemplateId}
        startEditTemplate={startEditTemplate}
      />

      <ProductSearchModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        products={filteredProducts}
        productSearch={productSearch}
        setProductSearch={setProductSearch}
        loadingProducts={loadingProducts}
        onInsert={insertProductLink}
      />

      <ConfirmReplyModal
        open={confirmReplyModal}
        onClose={() => setConfirmReplyModal(false)}
        onConfirm={async () => { sendManualReply(); setConfirmReplyModal(false); }}
        question={activeQuestion}
        replyText={replyText}
        sending={replyMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteQuestionModal}
        title="Excluir pergunta do sistema?"
        message={`Esta ação remove a pergunta apenas do seu sistema — ela não é excluída no Mercado Livre.\n\nPergunta #${deleteQuestionModal?.question_id}: ${deleteQuestionModal?.text?.slice(0, 80)}…`}
        confirmLabel="Excluir"
        loading={deletingQuestion}
        onConfirm={confirmDeleteQuestion}
        onClose={() => setDeleteQuestionModal(null)}
      />
    </div>
  );
}
