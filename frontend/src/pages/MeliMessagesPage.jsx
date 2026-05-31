import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, RefreshCcw } from "lucide-react";
import api from "../services/api";
import { apiErrorMessage, notifyError, notifyWarning } from "../utils/notify.js";
import { useNotifications } from "../contexts/NotificationContext";
import { useSmartSuggestions } from "../hooks/useSmartSuggestions";
import ConfirmDialog from "../components/ConfirmDialog";
import { AccountSelector } from "../components/meli-messages/AccountSelector";
import { QuestionList }    from "../components/meli-messages/QuestionList";
import { ReplyComposer }   from "../components/meli-messages/ReplyComposer";
import { TemplateEditor }  from "../components/meli-messages/TemplateEditor";

const QUESTIONS_POLL_MS = 5 * 60 * 1000;

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

  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
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

  // Hashtag autocomplete
  const replyTextareaRef = useRef(null);
  const hashAnchorRef    = useRef(null);
  const [hashQuery, setHashQuery] = useState("");
  const [hashDropdownOpen, setHashDropdownOpen] = useState(false);
  const [hashDropdownIndex, setHashDropdownIndex] = useState(0);

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
      setSelectedQuestionId((prev) => {
        if (items.length === 0) return null;
        if (prev != null && items.some((q) => q.question_id === prev)) return prev;
        return items[0]?.question_id ?? null;
      });
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

  useEffect(() => {
    (async () => {
      try { await Promise.all([loadAccounts(), loadTemplates()]); }
      catch { notifyError("Erro ao carregar dados iniciais de Mensagens ML"); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    setSelectedQuestionId(null);
    setReplyText("");
    loadQuestions();
    loadProducts("");
  }, [selectedUserId, statusFilter, loadQuestions]);

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
    if (!selectedQuestionId) { setBuyerThread([]); return; }
    const q = questions.find((q) => q.question_id === selectedQuestionId);
    if (!q?.from_id) { setBuyerThread([]); return; }
    let cancelled = false;
    setLoadingBuyerThread(true);
    api.get("/meli/messages/questions/buyer-thread", { params: { from_id: q.from_id, user_id: selectedUserId } })
      .then(({ data }) => { if (!cancelled) setBuyerThread(Array.isArray(data?.items) ? data.items : []); })
      .catch(() => { if (!cancelled) setBuyerThread([]); })
      .finally(() => { if (!cancelled) setLoadingBuyerThread(false); });
    return () => { cancelled = true; };
  }, [selectedQuestionId, selectedUserId]);

  // Hashtag dropdown: fechar ao clicar fora
  useEffect(() => {
    if (!hashDropdownOpen) return;
    function close(e) {
      if (hashAnchorRef.current && !hashAnchorRef.current.contains(e.target)) setHashDropdownOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [hashDropdownOpen]);

  // ─── Derived values ───────────────────────────────────────────────────────────
  const selectedQuestion = useMemo(
    () => questions.find((q) => q.question_id === selectedQuestionId) || null,
    [questions, selectedQuestionId]
  );
  const smartSuggestions = useSmartSuggestions(selectedQuestion?.text);
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

  // ─── Handlers ─────────────────────────────────────────────────────────────────
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

  async function sendManualReply() {
    if (!selectedQuestion) return;
    const text = replyText.trim();
    if (!text) { notifyWarning("Digite uma resposta antes de enviar"); return; }
    setSendingReply(true);
    try {
      await api.post(`/meli/messages/questions/${selectedQuestion.question_id}/reply`, { text });
      setReplyText("");
      await loadQuestions();
      fetchUnread();
    } catch (error) {
      notifyError(apiErrorMessage(error, "Erro ao enviar resposta manual"));
    } finally { setSendingReply(false); }
  }

  async function openSelectedQuestionListing() {
    if (!selectedQuestion?.item_id) { notifyWarning("A pergunta selecionada não possui item_id"); return; }
    const local = products.find((p) => String(p.id || "") === String(selectedQuestion.item_id));
    if (local?.permalink) { window.open(local.permalink, "_blank", "noopener,noreferrer"); return; }
    try {
      const { data } = await api.get(`/meli/items/${selectedQuestion.item_id}/permalink`);
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
      setSelectedQuestionId(null);
      await loadQuestions();
    } catch (error) {
      notifyError(error.response?.data?.error || "Erro ao excluir pergunta");
    } finally { setDeletingQuestion(false); }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle size={22} className="text-brand-600" />
            Mensagens ML
          </h1>
          <p className="text-gray-500 mt-1">Gerencie perguntas, respostas e templates.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadQuestions}
            disabled={loadingQuestions || !selectedUserId}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm disabled:opacity-50"
          >
            {loadingQuestions ? "Carregando..." : "Atualizar"}
          </button>
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCcw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </div>

      <main className="space-y-6">
        <AccountSelector
          accounts={accounts}
          selectedUserId={selectedUserId}
          setSelectedUserId={setSelectedUserId}
          hasDotForUserId={hasDotForUserId}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          questionsCount={questions.length}
        />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <QuestionList
            selectedUserId={selectedUserId}
            loadingQuestions={loadingQuestions}
            questions={questions}
            selectedQuestionId={selectedQuestionId}
            setSelectedQuestionId={setSelectedQuestionId}
            setReplyText={setReplyText}
            setDeleteQuestionModal={setDeleteQuestionModal}
            selectedAccount={selectedAccount}
          />
          <ReplyComposer
            selectedQuestion={selectedQuestion}
            buyerThread={buyerThread}
            loadingBuyerThread={loadingBuyerThread}
            replyText={replyText}
            hashAnchorRef={hashAnchorRef}
            replyTextareaRef={replyTextareaRef}
            hashDropdownOpen={hashDropdownOpen}
            hashSuggestions={hashSuggestions}
            hashDropdownIndex={hashDropdownIndex}
            smartSuggestions={smartSuggestions}
            products={products}
            filteredProducts={filteredProducts}
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            loadingProducts={loadingProducts}
            sendingReply={sendingReply}
            handleReplyChange={handleReplyChange}
            handleReplyKeyDown={handleReplyKeyDown}
            applySuggestion={applySuggestion}
            applyHashTemplate={applyHashTemplate}
            insertProductLink={insertProductLink}
            sendManualReply={sendManualReply}
            openSelectedQuestionListing={openSelectedQuestionListing}
            setDeleteQuestionModal={setDeleteQuestionModal}
          />
        </div>

        <TemplateEditor
          templates={templates}
          newTemplateName={newTemplateName} setNewTemplateName={setNewTemplateName}
          newTemplateContent={newTemplateContent} setNewTemplateContent={setNewTemplateContent}
          createTemplate={createTemplate} savingTemplate={savingTemplate}
          editingTemplateId={editingTemplateId} setEditingTemplateId={setEditingTemplateId}
          editingTemplateName={editingTemplateName} setEditingTemplateName={setEditingTemplateName}
          editingTemplateContent={editingTemplateContent} setEditingTemplateContent={setEditingTemplateContent}
          saveTemplateEdit={saveTemplateEdit}
          deleteTemplate={deleteTemplate} deletingTemplateId={deletingTemplateId}
          insertTemplateInReply={insertTemplateInReply}
          startEditTemplate={startEditTemplate}
        />
      </main>

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
