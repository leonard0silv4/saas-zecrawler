import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, MessageCircle, RefreshCcw } from "lucide-react";
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

const QUESTIONS_POLL_MS = 5 * 60 * 1000;

function cn(...c) { return c.filter(Boolean).join(" "); }

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function MeliMessagesPage() {
  const { hasDotForUserId, fetchUnread } = useNotifications();

  // ─── State ───────────────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [statusFilter, setStatusFilter] = useState("UNANSWERED");
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [selectedConversationFromId, setSelectedConversationFromId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingTemplateContent, setEditingTemplateContent] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState(null);

  const [deleteQuestionModal, setDeleteQuestionModal] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [buyerThread, setBuyerThread] = useState([]);
  const [loadingBuyerThread, setLoadingBuyerThread] = useState(false);
  const [buyerThreadRefreshKey, setBuyerThreadRefreshKey] = useState(0);
  const [listingProduct, setListingProduct] = useState(null);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);

  // Hashtag autocomplete
  const replyTextareaRef = useRef(null);
  const hashAnchorRef    = useRef(null);
  const [hashQuery, setHashQuery] = useState("");
  const [hashDropdownOpen, setHashDropdownOpen] = useState(false);
  const [hashDropdownIndex, setHashDropdownIndex] = useState(0);

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
    return [...map.values()].sort((a, b) => (b.lastDate > a.lastDate ? 1 : -1));
  }, [questions]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.from_id === selectedConversationFromId) || null,
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

  const smartSuggestions = useSmartSuggestions(activeQuestion?.text);
  const filteredProducts = useMemo(() => {
    const s = productSearch.trim().toLowerCase();
    if (!s) return products.slice(0, 8);
    return products.filter((p) => String(p.title || p.SKU || "").toLowerCase().includes(s)).slice(0, 8);
  }, [products, productSearch]);
  const hashSuggestions = useMemo(() => {
    if (!hashDropdownOpen) return [];
    return templates.filter((t) => t.isActive && t.name.toLowerCase().includes(hashQuery)).slice(0, 6);
  }, [hashDropdownOpen, hashQuery, templates]);

  // ─── Data fetching ────────────────────────────────────────────────────────────
  async function loadAccounts() {
    const { data } = await api.get("/meli/accounts");
    setAccounts(data);
    if (!selectedUserId && data.length > 0) setSelectedUserId(String(data[0].user_id));
  }

  async function loadTemplates() {
    const { data } = await api.get("/meli/messages/templates");
    setTemplates(Array.isArray(data) ? data : []);
  }

  const loadQuestions = useCallback(async ({ silent = false } = {}) => {
    if (!selectedUserId) return;
    if (!silent) setLoadingQuestions(true);
    try {
      const { data } = await api.get("/meli/messages/questions", {
        params: { user_id: selectedUserId, status: statusFilter, page: 1, limit: 50 },
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      setQuestions(items);
    } catch (error) {
      if (!silent) notifyError(error.response?.data?.error || "Erro ao carregar perguntas");
    } finally {
      if (!silent) setLoadingQuestions(false);
    }
  }, [selectedUserId, statusFilter]);

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

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try { await Promise.all([loadAccounts(), loadTemplates()]); }
      catch { notifyError("Erro ao carregar dados iniciais de Mensagens ML"); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    setSelectedConversationFromId(null);
    setReplyText("");
    loadQuestions();
    loadProducts("");
  }, [selectedUserId, statusFilter, loadQuestions]);

  // Auto-select first conversation
  useEffect(() => {
    if (conversations.length === 0) { setSelectedConversationFromId(null); return; }
    setSelectedConversationFromId((prev) => {
      if (prev != null && conversations.some((c) => c.from_id === prev)) return prev;
      return conversations[0]?.from_id ?? null;
    });
  }, [conversations]);

  useEffect(() => {
    if (!selectedUserId) return;
    const id = setInterval(() => {
      if (!document.hidden) loadQuestions({ silent: true });
    }, QUESTIONS_POLL_MS);
    return () => clearInterval(id);
  }, [selectedUserId, statusFilter, loadQuestions]);

  useEffect(() => {
    if (!selectedUserId || !accounts.length) return;
    const handle = setTimeout(() => loadProducts(productSearch), 300);
    return () => clearTimeout(handle);
  }, [selectedUserId, productSearch, accounts.length]);

  // Buyer thread
  useEffect(() => {
    if (!selectedConversationFromId) { setBuyerThread([]); return; }
    let cancelled = false;
    setLoadingBuyerThread(true);
    api
      .get("/meli/messages/questions/buyer-thread", {
        params: { from_id: selectedConversationFromId, user_id: selectedUserId },
      })
      .then(({ data }) => { if (!cancelled) setBuyerThread(Array.isArray(data?.items) ? data.items : []); })
      .catch(() => { if (!cancelled) setBuyerThread([]); })
      .finally(() => { if (!cancelled) setLoadingBuyerThread(false); });
    return () => { cancelled = true; };
  }, [selectedConversationFromId, selectedUserId, buyerThreadRefreshKey]);

  // Bug fix: sempre limpar listingProduct antes de buscar, evita produto obsoleto durante transição
  useEffect(() => {
    setListingProduct(null);
    const itemId = activeQuestion?.item_id;
    if (!itemId) return;
    let cancelled = false;
    api
      .get(`/meli/items/${itemId}/details`)
      .then(({ data }) => { if (!cancelled) setListingProduct(data || null); })
      .catch(() => { if (!cancelled) setListingProduct(null); });
    return () => { cancelled = true; };
  }, [activeQuestion?.item_id]);

  // Hashtag dropdown: close on outside click
  useEffect(() => {
    if (!hashDropdownOpen) return;
    function close(e) {
      if (hashAnchorRef.current && !hashAnchorRef.current.contains(e.target)) setHashDropdownOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [hashDropdownOpen]);

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

  // Toolbar: insere saudação no cursor
  function insertGreeting() {
    const text = `${getGreeting()}! `;
    const ta = replyTextareaRef.current;
    if (!ta) { setReplyText((prev) => text + prev); return; }
    const start = ta.selectionStart ?? 0;
    const end   = ta.selectionEnd   ?? 0;
    setReplyText(replyText.slice(0, start) + text + replyText.slice(end));
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length); });
  }

  // Bug fix: update otimista do status antes do refetch evita formulário reaparecer
  async function sendManualReply() {
    if (!activeQuestion) return;
    const text = replyText.trim();
    if (!text) { notifyWarning("Digite uma resposta antes de enviar"); return; }
    setSendingReply(true);
    try {
      await api.post(`/meli/messages/questions/${activeQuestion.question_id}/reply`, { text });
      setReplyText("");
      setQuestions((prev) =>
        prev.map((q) =>
          q.question_id === activeQuestion.question_id ? { ...q, status: "ANSWERED" } : q
        )
      );
      await loadQuestions();
      fetchUnread();
      setBuyerThreadRefreshKey((k) => k + 1);
    } catch (error) {
      notifyError(apiErrorMessage(error, "Erro ao enviar resposta manual"));
    } finally { setSendingReply(false); }
  }

  async function openSelectedQuestionListing() {
    if (!activeQuestion?.item_id) { notifyWarning("A pergunta selecionada não possui item_id"); return; }
    if (listingProduct?.permalink) { window.open(listingProduct.permalink, "_blank", "noopener,noreferrer"); return; }
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
    try { await api.post("/meli/messages/sync"); await loadQuestions(); fetchUnread(); }
    catch (error) { notifyError(error.response?.data?.error || "Erro ao sincronizar perguntas"); }
    finally { setSyncing(false); }
  }

  async function createTemplate() {
    const name = newTemplateName.trim(); const content = newTemplateContent.trim();
    if (!name || !content) { notifyWarning("Informe nome e conteúdo do template"); return; }
    setSavingTemplate(true);
    try { await api.post("/meli/messages/templates", { name, content, isActive: true }); setNewTemplateName(""); setNewTemplateContent(""); await loadTemplates(); }
    catch (error) { notifyError(error.response?.data?.error || "Erro ao criar template"); }
    finally { setSavingTemplate(false); }
  }

  async function saveTemplateEdit() {
    const name = editingTemplateName.trim(); const content = editingTemplateContent.trim();
    if (!name || !content) { notifyWarning("Nome e conteúdo são obrigatórios"); return; }
    setSavingTemplate(true);
    try { await api.put(`/meli/messages/templates/${editingTemplateId}`, { name, content }); setEditingTemplateId(null); setEditingTemplateName(""); setEditingTemplateContent(""); await loadTemplates(); }
    catch (error) { notifyError(error.response?.data?.error || "Erro ao atualizar template"); }
    finally { setSavingTemplate(false); }
  }

  function startEditTemplate(template) {
    setEditingTemplateId(template._id);
    setEditingTemplateName(template.name || "");
    setEditingTemplateContent(template.content || "");
  }

  async function deleteTemplate(id) {
    setDeletingTemplateId(id);
    try { await api.delete(`/meli/messages/templates/${id}`); await loadTemplates(); }
    catch (error) { notifyError(error.response?.data?.error || "Erro ao excluir template"); }
    finally { setDeletingTemplateId(null); }
  }

  async function confirmDeleteQuestion() {
    if (!deleteQuestionModal) return;
    setDeletingQuestion(true);
    try {
      await api.delete(`/meli/messages/questions/${deleteQuestionModal.question_id}`);
      setDeleteQuestionModal(null);
      await loadQuestions();
    } catch (error) {
      notifyError(error.response?.data?.error || "Erro ao excluir pergunta");
    } finally { setDeletingQuestion(false); }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="-m-4 lg:-m-8 flex-1 flex flex-col bg-[#f8f9fa] overflow-hidden">
      {/* Page header */}
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <MessageCircle size={20} className="text-brand-600" />
          <h1 className="text-base font-bold text-gray-900 whitespace-nowrap">Mensagens ML</h1>
        </div>

        <div className="h-5 w-px bg-gray-200 shrink-0 mx-1" />

        <AccountSelector
          accounts={accounts}
          selectedUserId={selectedUserId}
          setSelectedUserId={setSelectedUserId}
          hasDotForUserId={hasDotForUserId}
          inline
        />

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter("UNANSWERED")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 flex items-center gap-1.5",
              statusFilter === "UNANSWERED"
                ? "bg-brand-50 border-brand-300 text-brand-700"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <Clock size={12} /> Pendentes
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ANSWERED")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 flex items-center gap-1.5",
              statusFilter === "ANSWERED"
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <CheckCircle2 size={12} /> Respondidas
          </button>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 tabular-nums">
            {conversations.length}
          </span>

          <button
            type="button"
            onClick={loadQuestions}
            disabled={loadingQuestions || !selectedUserId}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-medium disabled:opacity-50 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
          >
            {loadingQuestions ? "Carregando..." : "Atualizar"}
          </button>
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 hover:bg-brand-700 active:bg-brand-800 transition-all duration-200 shadow-sm"
          >
            <RefreshCcw size={13} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </header>

      {/* Área principal 3 colunas */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <ConversationList
          conversations={conversations}
          selectedConversationFromId={selectedConversationFromId}
          onSelectConversation={handleSelectConversation}
          loadingQuestions={loadingQuestions}
          selectedUserId={selectedUserId}
          statusFilter={statusFilter}
        />
        <ChatThread
          selectedConversation={selectedConversation}
          activeQuestion={activeQuestion}
          listingProduct={listingProduct}
          buyerThread={buyerThread}
          loadingBuyerThread={loadingBuyerThread}
          replyText={replyText}
          hashAnchorRef={hashAnchorRef}
          replyTextareaRef={replyTextareaRef}
          hashDropdownOpen={hashDropdownOpen}
          hashSuggestions={hashSuggestions}
          hashDropdownIndex={hashDropdownIndex}
          smartSuggestions={smartSuggestions}
          sendingReply={sendingReply}
          handleReplyChange={handleReplyChange}
          handleReplyKeyDown={handleReplyKeyDown}
          applySuggestion={applySuggestion}
          applyHashTemplate={applyHashTemplate}
          sendManualReply={sendManualReply}
          openSelectedQuestionListing={openSelectedQuestionListing}
          setDeleteQuestionModal={setDeleteQuestionModal}
          onInsertGreeting={insertGreeting}
          onOpenTemplateModal={() => setTemplateModalOpen(true)}
          onOpenProductModal={() => setProductModalOpen(true)}
        />
      </div>

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
