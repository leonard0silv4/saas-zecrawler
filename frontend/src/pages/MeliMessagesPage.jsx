import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Store,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import api from "../services/api";
import { apiErrorMessage, notifyError, notifyWarning } from "../utils/notify.js";
import { useNotifications } from "../contexts/NotificationContext";
import { useSmartSuggestions } from "../hooks/useSmartSuggestions";

const QUESTIONS_POLL_MS = 5 * 60 * 1000;

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function formatRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function MeliMessagesPage() {
  const { hasDotForUserId, fetchUnread } = useNotifications();
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
  const [deleteQuestionModal, setDeleteQuestionModal] = useState(null); // { question_id, text, status }
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [buyerThread, setBuyerThread] = useState([]);
  const [loadingBuyerThread, setLoadingBuyerThread] = useState(false);
  const replyTextareaRef = useRef(null);
  const hashAnchorRef = useRef(null);
  const [hashQuery, setHashQuery] = useState("");
  const [hashDropdownOpen, setHashDropdownOpen] = useState(false);
  const [hashDropdownIndex, setHashDropdownIndex] = useState(0);

  async function loadAccounts() {
    const { data } = await api.get("/meli/accounts");
    setAccounts(data);
    if (!selectedUserId && data.length > 0) {
      setSelectedUserId(String(data[0].user_id));
    }
  }

  async function loadTemplates() {
    const { data } = await api.get("/meli/messages/templates");
    setTemplates(Array.isArray(data) ? data : []);
  }

  const loadQuestions = useCallback(
    async ({ silent = false } = {}) => {
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
          if (prev == null) return items[0].question_id;
          return items[0]?.question_id ?? null;
        });
      } catch (error) {
        if (!silent) {
          notifyError(error.response?.data?.error || "Erro ao carregar perguntas");
        }
      } finally {
        if (!silent) setLoadingQuestions(false);
      }
    },
    [selectedUserId, statusFilter]
  );

  async function loadProducts(query = "") {
    if (!accounts.length) {
      setProducts([]);
      return;
    }
    setLoadingProducts(true);
    try {
      const { data } = await api.get("/meli/products/autocomplete", {
        params: { q: query },
      });
      setProducts(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      setProducts([]);
      notifyError(error.response?.data?.error || "Erro ao carregar produtos da conta");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadAccounts(), loadTemplates()]);
      } catch (error) {
        notifyError("Erro ao carregar dados iniciais de Mensagens ML");
      }
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
      if (document.hidden) return;
      loadQuestions({ silent: true });
    }, QUESTIONS_POLL_MS);
    return () => clearInterval(id);
  }, [selectedUserId, statusFilter, loadQuestions]);

  useEffect(() => {
    if (!selectedUserId || !accounts.length) return;
    const handle = setTimeout(() => {
      loadProducts(productSearch);
    }, 300);
    return () => clearTimeout(handle);
  }, [selectedUserId, productSearch, accounts.length]);

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.question_id === selectedQuestionId) || null,
    [questions, selectedQuestionId]
  );

  const smartSuggestions = useSmartSuggestions(selectedQuestion?.text);

  function applySuggestion(text) {
    setReplyText((prev) => (prev.trim() ? `${prev.trimEnd()}\n${text}` : text));
    requestAnimationFrame(() => {
      const ta = replyTextareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });
  }

  // Fechar dropdown de hashtag ao clicar fora
  useEffect(() => {
    if (!hashDropdownOpen) return;
    function handleClickOutside(e) {
      if (hashAnchorRef.current && !hashAnchorRef.current.contains(e.target)) {
        setHashDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hashDropdownOpen]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    if (!search) return products.slice(0, 8);
    return products
      .filter((p) => String(p.title || p.SKU || "").toLowerCase().includes(search))
      .slice(0, 8);
  }, [products, productSearch]);

  useEffect(() => {
    if (!selectedQuestion?.from_id) {
      setBuyerThread([]);
      return;
    }
    let cancelled = false;
    setLoadingBuyerThread(true);
    api
      .get("/meli/messages/questions/buyer-thread", {
        params: { from_id: selectedQuestion.from_id, user_id: selectedUserId },
      })
      .then(({ data }) => {
        if (!cancelled) setBuyerThread(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) setBuyerThread([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBuyerThread(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedQuestion?.from_id, selectedUserId]);

  function insertProductLink(permalink) {
    if (!permalink) return;
    const greeting = getGreeting();
    const formattedText = `${greeting}! Aqui está o anúncio que você procura. ${permalink}`;
    const ta = replyTextareaRef.current;
    if (!ta) {
      setReplyText((prev) => `${prev}${prev ? "\n" : ""}${formattedText}`);
      setProductSearch("");
      return;
    }
    const start = ta.selectionStart ?? replyText.length;
    const end = ta.selectionEnd ?? replyText.length;
    const next = `${replyText.slice(0, start)}${formattedText}${replyText.slice(end)}`;
    setReplyText(next);
    setProductSearch("");
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + formattedText.length;
      ta.setSelectionRange(cursor, cursor);
    });
  }

  function insertTemplateInReply(templateContent) {
    const content = String(templateContent || "").trim();
    if (!content) return;
    const ta = replyTextareaRef.current;
    if (!ta) {
      setReplyText((prev) => `${prev}${prev ? "\n\n" : ""}${content}`);
      return;
    }
    const start = ta.selectionStart ?? replyText.length;
    const end = ta.selectionEnd ?? replyText.length;
    const spacerBefore = replyText && start > 0 ? "\n\n" : "";
    const next = `${replyText.slice(0, start)}${spacerBefore}${content}${replyText.slice(end)}`;
    setReplyText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + spacerBefore.length + content.length;
      ta.setSelectionRange(cursor, cursor);
    });
  }

  async function syncNow() {
    setSyncing(true);
    try {
      await api.post("/meli/messages/sync");
      await loadQuestions();
      fetchUnread(); // atualiza contagem de não respondidas no badge
    } catch (error) {
      notifyError(error.response?.data?.error || "Erro ao sincronizar perguntas");
    } finally {
      setSyncing(false);
    }
  }

  async function sendManualReply() {
    if (!selectedQuestion) return;
    const text = replyText.trim();
    if (!text) {
      notifyWarning("Digite uma resposta antes de enviar");
      return;
    }
    setSendingReply(true);
    try {
      await api.post(`/meli/messages/questions/${selectedQuestion.question_id}/reply`, { text });
      setReplyText("");
      await loadQuestions();
      fetchUnread();
    } catch (error) {
      notifyError(apiErrorMessage(error, "Erro ao enviar resposta manual"));
    } finally {
      setSendingReply(false);
    }
  }

  async function openSelectedQuestionListing() {
    if (!selectedQuestion?.item_id) {
      notifyWarning("A pergunta selecionada não possui item_id");
      return;
    }

    // 1. Tenta no estado local primeiro (já carregado na sidebar de produtos)
    const localMatch = products.find((p) => String(p.id || "") === String(selectedQuestion.item_id));
    if (localMatch?.permalink) {
      window.open(localMatch.permalink, "_blank", "noopener,noreferrer");
      return;
    }

    // 2. Busca diretamente pelo ID do anúncio — sem filtro de status/estoque
    try {
      const { data } = await api.get(`/meli/items/${selectedQuestion.item_id}/permalink`);
      if (data?.permalink) {
        window.open(data.permalink, "_blank", "noopener,noreferrer");
        return;
      }
      notifyWarning("Não foi possível localizar o permalink do anúncio desta pergunta");
    } catch (error) {
      if (error.response?.status === 404) {
        notifyWarning("Anúncio não encontrado nas contas conectadas");
      } else {
        notifyError(error.response?.data?.error || "Erro ao localizar o anúncio da pergunta");
      }
    }
  }

  // Hashtag autocomplete: sugestões filtradas por nome
  const hashSuggestions = useMemo(() => {
    if (!hashDropdownOpen) return [];
    return templates
      .filter((t) => t.isActive && t.name.toLowerCase().includes(hashQuery))
      .slice(0, 6);
  }, [hashDropdownOpen, hashQuery, templates]);

  function handleReplyChange(e) {
    const val = e.target.value;
    setReplyText(val);
    const cursor = e.target.selectionStart;
    const prefix = val.slice(0, cursor);
    const match = /(^|\s)#(\w*)$/.exec(prefix);
    if (match) {
      setHashQuery(match[2].toLowerCase());
      setHashDropdownOpen(true);
      setHashDropdownIndex(0);
    } else {
      setHashDropdownOpen(false);
      setHashQuery("");
    }
  }

  function handleReplyKeyDown(e) {
    if (!hashDropdownOpen || hashSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHashDropdownIndex((i) => (i + 1) % hashSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHashDropdownIndex((i) => (i - 1 + hashSuggestions.length) % hashSuggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (hashSuggestions[hashDropdownIndex]) {
        e.preventDefault();
        applyHashTemplate(hashSuggestions[hashDropdownIndex]);
      }
    } else if (e.key === "Escape") {
      setHashDropdownOpen(false);
    }
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
      if (ta) {
        ta.focus();
        const pos = tokenStart + template.content.length;
        ta.setSelectionRange(pos, pos);
      }
    });
  }

  async function createTemplate() {
    const name = newTemplateName.trim();
    const content = newTemplateContent.trim();
    if (!name || !content) {
      notifyWarning("Informe nome e conteúdo do template");
      return;
    }
    try {
      await api.post("/meli/messages/templates", { name, content, isActive: true });
      setNewTemplateName("");
      setNewTemplateContent("");
      await loadTemplates();
    } catch (error) {
      notifyError(error.response?.data?.error || "Erro ao criar template");
    }
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
    } finally {
      setDeletingQuestion(false);
    }
  }

  async function deleteTemplate(id) {
    try {
      await api.delete(`/meli/messages/templates/${id}`);
      await loadTemplates();
    } catch (error) {
      notifyError(error.response?.data?.error || "Erro ao excluir template");
    }
  }

  function startEditTemplate(template) {
    setEditingTemplateId(template._id);
    setEditingTemplateName(template.name || "");
    setEditingTemplateContent(template.content || "");
  }

  async function saveTemplateEdit() {
    if (!editingTemplateId) return;
    const name = editingTemplateName.trim();
    const content = editingTemplateContent.trim();
    if (!name || !content) {
      notifyWarning("Nome e conteúdo do template são obrigatórios");
      return;
    }
    try {
      await api.put(`/meli/messages/templates/${editingTemplateId}`, { name, content });
      setEditingTemplateId(null);
      setEditingTemplateName("");
      setEditingTemplateContent("");
      await loadTemplates();
    } catch (error) {
      notifyError(error.response?.data?.error || "Erro ao atualizar template");
    }
  }

  const selectedAccount = accounts.find((a) => String(a.user_id) === selectedUserId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="text-brand-600" />
            Mensagens Mercado Livre
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
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Store size={14} />
            Conta:
          </span>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => {
              const uid = String(a.user_id);
              const hasDot = hasDotForUserId(uid);
              return (
                <button
                  key={a.user_id}
                  type="button"
                  onClick={() => setSelectedUserId(uid)}
                  className={cn(
                    "relative px-3 py-2 rounded-lg text-sm transition",
                    selectedUserId === uid
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {a.nickname || a.user_id}
                  {hasDot && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("UNANSWERED")}
          className={cn(
            "px-3 py-2 rounded-lg text-sm border flex items-center gap-2",
            statusFilter === "UNANSWERED" ? "bg-brand-50 border-brand-200 text-brand-700" : "bg-white border-gray-200 text-gray-600"
          )}
        >
          <Clock size={14} /> Pendentes
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("ANSWERED")}
          className={cn(
            "px-3 py-2 rounded-lg text-sm border flex items-center gap-2",
            statusFilter === "ANSWERED" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-gray-200 text-gray-600"
          )}
        >
          <CheckCircle2 size={14} /> Respondidas
        </button>
        <span className="ml-auto text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
          {questions.length} {questions.length === 1 ? "pergunta" : "perguntas"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-1">Perguntas</h2>
          <p className="text-xs text-gray-500 mb-3">
            {selectedAccount ? `Conta: ${selectedAccount.nickname || selectedAccount.user_id}` : "Selecione uma conta"}
          </p>
          {!selectedUserId ? (
            <p className="text-sm text-gray-500">Conecte e selecione uma conta para listar perguntas.</p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma pergunta para os filtros atuais.</p>
          ) : (
            <div className="max-h-[560px] overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
              {questions.map((q) => (
                <div
                  key={q.question_id}
                  className={cn(
                    "relative group",
                    selectedQuestionId === q.question_id ? "bg-brand-50" : "hover:bg-gray-50"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQuestionId(q.question_id);
                      setReplyText("");
                    }}
                    className="w-full text-left p-3 pr-9 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full",
                        q.status === "ANSWERED" ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-700"
                      )}>
                        {q.status === "ANSWERED" ? "Respondida" : "Pendente"}
                      </span>
                      <span className="text-xs text-gray-500">{formatRelativeTime(q.date_created)}</span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium line-clamp-1">{q.item_title || q.item_id || "Sem item"}</p>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{q.text}</p>
                    {q.answer_text && (
                      <p className="text-xs text-emerald-700 mt-2 line-clamp-1 flex items-center gap-1">
                        <Check size={12} /> {q.answer_text}
                      </p>
                    )}
                  </button>
                  <button
                    type="button"
                    title="Excluir pergunta"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteQuestionModal({ question_id: q.question_id, text: q.text, status: q.status });
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 space-y-4 lg:col-span-3">
          <h2 className="font-semibold text-gray-900">Responder</h2>
          {!selectedQuestion ? (
            <p className="text-sm text-gray-500">Selecione uma pergunta para responder.</p>
          ) : (
            <>
              {/* Thread de histórico do comprador */}
              {loadingBuyerThread && (
                <p className="text-xs text-gray-400">Carregando histórico do comprador...</p>
              )}
              {!loadingBuyerThread && buyerThread.length >= 2 && (
                <div className="rounded-lg border-2 border-violet-200 bg-violet-50/40 text-sm overflow-hidden">
                  <p className="text-xs font-semibold text-violet-700 px-3 pt-2.5 pb-1.5 flex items-center gap-1.5">
                    <MessageCircle size={12} />
                    Histórico com{" "}
                    <span className="text-violet-900">
                      {selectedQuestion.from_nickname ||
                        buyerThread.find((i) => i.from_nickname)?.from_nickname ||
                        `comprador #${selectedQuestion.from_id}`}
                    </span>
                    <span className="ml-auto font-normal text-violet-500">
                      {buyerThread.length} {buyerThread.length === 1 ? "interação" : "interações"}
                    </span>
                  </p>
                  <div className="divide-y divide-violet-100 max-h-52 overflow-y-auto">
                    {buyerThread.map((item) => {
                      const isCurrent = item.question_id === selectedQuestion.question_id;
                      return (
                        <div
                          key={item.question_id}
                          className={cn(
                            "px-3 py-2 space-y-1",
                            isCurrent ? "border-l-2 border-violet-400 bg-white" : "bg-violet-50/30"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">{formatDate(item.date_created)}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">atual</span>
                            )}
                          </div>
                          <p className={cn("text-gray-800 leading-snug", isCurrent ? "font-medium" : "")}>
                            {item.text}
                          </p>
                          {item.answer_text ? (
                            <p className="text-xs text-emerald-700 flex items-start gap-1">
                              <Check size={11} className="mt-0.5 shrink-0" />
                              <span>{item.answer_text}</span>
                            </p>
                          ) : !isCurrent ? (
                            <p className="text-xs text-gray-400 italic">Sem resposta ainda</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-sm bg-gray-50 rounded-lg border border-gray-100 p-3 space-y-1">
                <p className="text-gray-500">Pergunta selecionada #{selectedQuestion.question_id}</p>
                <p className="font-medium text-gray-900">{selectedQuestion.item_title || selectedQuestion.item_id || "Sem item"}</p>
                <p className="text-gray-700">{selectedQuestion.text}</p>
              </div>

              {selectedQuestion.status === "ANSWERED" && selectedQuestion.answer_text && (
                <div className="text-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-950 space-y-1">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Sua resposta</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedQuestion.answer_text}</p>
                  {selectedQuestion.answer_date_created && (
                    <p className="text-xs text-emerald-800/90 pt-1">Enviada em {formatDate(selectedQuestion.answer_date_created)}</p>
                  )}
                </div>
              )}

              {selectedQuestion.status !== "ANSWERED" && smartSuggestions.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                    <Zap size={11} /> Sugestões rápidas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {smartSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="text-xs px-2.5 py-1 rounded-full border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedQuestion.status !== "ANSWERED" && (
              <div>
                <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                  <Search size={12} /> Link do anúncio (disponibilidade conferida na API do Mercado Livre)
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Digite para buscar produto e inserir link na resposta..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {loadingProducts && <p className="text-xs text-gray-500 mt-1">Buscando produtos...</p>}
                {!loadingProducts && productSearch.trim() && filteredProducts.length === 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    Nenhum anúncio ativo com estoque no momento (dados ao vivo do ML).
                  </p>
                )}
                {filteredProducts.length > 0 && (
                  <div className="mt-2 border border-gray-100 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                    {filteredProducts.map((p) => (
                      <button
                        key={p._id || p.id}
                        type="button"
                        onClick={() => insertProductLink(p.permalink || "")}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex gap-3 items-center"
                      >
                        <div className="w-11 h-11 shrink-0 rounded-md border border-gray-100 bg-gray-100 overflow-hidden">
                          {p.thumbnail ? (
                            <img
                              src={p.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-sm text-gray-900 line-clamp-1">{p.title || p.SKU || "Produto sem título"}</p>
                          <p className="text-xs text-brand-700 truncate">{p.permalink || "Sem permalink"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )}

              {selectedQuestion.status !== "ANSWERED" && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Sua resposta</label>
                  <div className="relative" ref={hashAnchorRef}>
                    <textarea
                      ref={replyTextareaRef}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[140px]"
                      placeholder="Escreva sua resposta... (# para templates)"
                      value={replyText}
                      onChange={handleReplyChange}
                      onKeyDown={handleReplyKeyDown}
                    />
                    {hashDropdownOpen && hashSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        {hashSuggestions.map((t, idx) => (
                          <button
                            key={t._id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); applyHashTemplate(t); }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                              idx === hashDropdownIndex
                                ? "bg-brand-50 text-brand-700"
                                : "hover:bg-gray-50 text-gray-700"
                            )}
                          >
                            <span className="font-medium shrink-0">#{t.name}</span>
                            <span className="text-xs text-gray-400 line-clamp-1 flex-1">{t.content}</span>
                          </button>
                        ))}
                        <p className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">
                          Enter para inserir · Esc para fechar
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* {selectedQuestion.status === "ANSWERED" && (
                <div className="text-sm rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-emerald-800">
                  Esta pergunta já foi respondida e não pode receber uma nova resposta.
                </div>
              )} */}

              <div className="flex flex-wrap items-center gap-2">
                {selectedQuestion.status !== "ANSWERED" && (
                  <button
                    type="button"
                    onClick={sendManualReply}
                    disabled={sendingReply}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send size={14} />
                    {sendingReply ? "Enviando..." : "Enviar resposta"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteQuestionModal({ question_id: selectedQuestion.question_id, text: selectedQuestion.text, status: selectedQuestion.status })}
                  className="ml-auto p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  title="Excluir pergunta do sistema"
                  aria-label="Excluir pergunta"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={openSelectedQuestionListing}
                  disabled={!selectedQuestion.item_id}
                  className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  title="Abrir anúncio da pergunta selecionada"
                  aria-label="Abrir anúncio da pergunta selecionada"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Templates de resposta</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Nome do template"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
          />
          <input
            className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Conteúdo do template"
            value={newTemplateContent}
            onChange={(e) => setNewTemplateContent(e.target.value)}
          />
        </div>
        <button type="button" onClick={createTemplate} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium flex items-center gap-2">
          <Plus size={14} /> Criar template
        </button>
        {templates.length > 0 && (
          <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
            {templates.map((t) => (
              <div key={t._id} className="p-3 flex items-center gap-2 justify-between">
                {editingTemplateId === t._id ? (
                  <div className="w-full space-y-2">
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      value={editingTemplateName}
                      onChange={(e) => setEditingTemplateName(e.target.value)}
                    />
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      value={editingTemplateContent}
                      onChange={(e) => setEditingTemplateContent(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={saveTemplateEdit} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs flex items-center gap-1">
                        <Check size={12} /> Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTemplateId(null)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs flex items-center gap-1"
                      >
                        <X size={12} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {t.name} {!t.isActive && <span className="text-xs text-gray-500">(inativo)</span>}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-2">{t.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => insertTemplateInReply(t.content)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                      >
                        Inserir na resposta
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditTemplate(t)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs flex items-center gap-1"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(t._id)}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      </main>

      {/* Modal de confirmação: excluir pergunta */}
      {deleteQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-base">Excluir pergunta do sistema?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Esta ação remove a pergunta apenas do seu sistema — ela <strong>não é excluída no Mercado Livre</strong>.
                </p>
              </div>
            </div>

            {deleteQuestionModal.status === "UNANSWERED" && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Atenção:</strong> esta pergunta ainda está <strong>pendente de resposta</strong>. O comprador pode estar aguardando. Certifique-se de respondê-la diretamente no Mercado Livre antes de excluí-la aqui.
                </p>
              </div>
            )}

            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
              <p className="text-xs text-gray-500 mb-0.5">Pergunta #{deleteQuestionModal.question_id}</p>
              <p className="text-sm text-gray-800 line-clamp-3">{deleteQuestionModal.text}</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteQuestionModal(null)}
                disabled={deletingQuestion}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteQuestion}
                disabled={deletingQuestion}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium flex items-center gap-2 hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deletingQuestion ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
