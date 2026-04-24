import { useEffect, useMemo, useRef, useState } from "react";
import {
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
} from "lucide-react";
import api from "../services/api";

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

export default function MeliMessagesPage() {
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
  const replyTextareaRef = useRef(null);

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

  async function loadQuestions() {
    if (!selectedUserId) return;
    setLoadingQuestions(true);
    try {
      const { data } = await api.get("/meli/messages/questions", {
        params: { user_id: selectedUserId, status: statusFilter, page: 1, limit: 50 },
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      setQuestions(items);
      if (items.length > 0 && !selectedQuestionId) {
        setSelectedQuestionId(items[0].question_id);
      }
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao carregar perguntas");
    } finally {
      setLoadingQuestions(false);
    }
  }

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
      alert(error.response?.data?.error || "Erro ao carregar produtos da conta");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadAccounts(), loadTemplates()]);
      } catch (error) {
        alert("Erro ao carregar dados iniciais de Mensagens ML");
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    setSelectedQuestionId(null);
    setReplyText("");
    loadQuestions();
    loadProducts("");
  }, [selectedUserId, statusFilter]);

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

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    if (!search) return products.slice(0, 8);
    return products
      .filter((p) => String(p.title || p.SKU || "").toLowerCase().includes(search))
      .slice(0, 8);
  }, [products, productSearch]);

  function insertProductLink(permalink) {
    if (!permalink) return;
    const ta = replyTextareaRef.current;
    if (!ta) {
      setReplyText((prev) => `${prev}${prev ? "\n" : ""}${permalink}`);
      return;
    }
    const start = ta.selectionStart ?? replyText.length;
    const end = ta.selectionEnd ?? replyText.length;
    const next = `${replyText.slice(0, start)}${permalink}${replyText.slice(end)}`;
    setReplyText(next);
    setProductSearch("");
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + permalink.length;
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
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao sincronizar perguntas");
    } finally {
      setSyncing(false);
    }
  }

  async function sendManualReply() {
    if (!selectedQuestion) return;
    const text = replyText.trim();
    if (!text) {
      alert("Digite uma resposta antes de enviar");
      return;
    }
    setSendingReply(true);
    try {
      await api.post(`/meli/messages/questions/${selectedQuestion.question_id}/reply`, { text });
      setReplyText("");
      await loadQuestions();
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao enviar resposta manual");
    } finally {
      setSendingReply(false);
    }
  }

  async function openSelectedQuestionListing() {
    if (!selectedQuestion?.item_id || !selectedUserId) {
      alert("A pergunta selecionada não possui item_id");
      return;
    }

    const localMatch = products.find((p) => String(p.id || "") === String(selectedQuestion.item_id));
    if (localMatch?.permalink) {
      window.open(localMatch.permalink, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const { data } = await api.get("/meli/products/autocomplete", {
        params: { user_id: selectedUserId, q: selectedQuestion.item_id },
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      const exact = items.find((p) => String(p.id || "") === String(selectedQuestion.item_id));
      const picked = exact || items[0];
      if (picked?.permalink) {
        window.open(picked.permalink, "_blank", "noopener,noreferrer");
        return;
      }
      alert("Não foi possível localizar o permalink do anúncio desta pergunta");
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao localizar o anúncio da pergunta");
    }
  }

  async function sendTemplateReply(templateId) {
    if (!selectedQuestion || !templateId) return;
    setSendingReply(true);
    try {
      await api.post(`/meli/messages/questions/${selectedQuestion.question_id}/reply`, { templateId });
      await loadQuestions();
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao enviar resposta por template");
    } finally {
      setSendingReply(false);
    }
  }

  async function createTemplate() {
    const name = newTemplateName.trim();
    const content = newTemplateContent.trim();
    if (!name || !content) {
      alert("Informe nome e conteúdo do template");
      return;
    }
    try {
      await api.post("/meli/messages/templates", { name, content, isActive: true });
      setNewTemplateName("");
      setNewTemplateContent("");
      await loadTemplates();
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao criar template");
    }
  }

  async function deleteTemplate(id) {
    try {
      await api.delete(`/meli/messages/templates/${id}`);
      await loadTemplates();
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao excluir template");
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
      alert("Nome e conteúdo do template são obrigatórios");
      return;
    }
    try {
      await api.put(`/meli/messages/templates/${editingTemplateId}`, { name, content });
      setEditingTemplateId(null);
      setEditingTemplateName("");
      setEditingTemplateContent("");
      await loadTemplates();
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao atualizar template");
    }
  }

  const selectedAccount = accounts.find((a) => String(a.user_id) === selectedUserId);

  return (
    <div className="min-h-screen">
      <header className="bg-brand-700 sticky top-0 z-20 border-b border-brand-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center">
                <MessageCircle className="size-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Mensagens Mercado Livre</h1>
                <p className="text-xs text-white/70">Gerencie perguntas, respostas e templates</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadQuestions}
                disabled={loadingQuestions || !selectedUserId}
                className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 disabled:opacity-50"
              >
                {loadingQuestions ? "Carregando..." : "Atualizar"}
              </button>
              <button
                type="button"
                onClick={syncNow}
                disabled={syncing}
                className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCcw size={14} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Store size={14} />
            Conta:
          </span>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <button
                key={a.user_id}
                type="button"
                onClick={() => setSelectedUserId(String(a.user_id))}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm transition",
                  selectedUserId === String(a.user_id)
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {a.nickname || a.user_id}
              </button>
            ))}
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
                <button
                  key={q.question_id}
                  type="button"
                  onClick={() => {
                    setSelectedQuestionId(q.question_id);
                    setReplyText("");
                  }}
                  className={cn(
                    "w-full text-left p-3 transition",
                    selectedQuestionId === q.question_id ? "bg-brand-50" : "hover:bg-gray-50"
                  )}
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
              <div className="text-sm bg-gray-50 rounded-lg border border-gray-100 p-3 space-y-1">
                <p className="text-gray-500">Pergunta selecionada #{selectedQuestion.question_id}</p>
                <p className="font-medium text-gray-900">{selectedQuestion.item_title || selectedQuestion.item_id || "Sem item"}</p>
                <p className="text-gray-700">{selectedQuestion.text}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                  <Search size={12} /> Link do anúncio (autocomplete de todas as contas conectadas)
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Digite para buscar produto e inserir link na resposta..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {loadingProducts && <p className="text-xs text-gray-500 mt-1">Buscando produtos...</p>}
                {filteredProducts.length > 0 && (
                  <div className="mt-2 border border-gray-100 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                    {filteredProducts.map((p) => (
                      <button
                        key={p._id || p.id}
                        type="button"
                        onClick={() => insertProductLink(p.permalink || "")}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50"
                      >
                        <p className="text-sm text-gray-900 line-clamp-1">{p.title || p.SKU || "Produto sem título"}</p>
                        <p className="text-xs text-brand-700 truncate">{p.permalink || "Sem permalink"}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Sua resposta</label>
                <textarea
                  ref={replyTextareaRef}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[140px]"
                  placeholder="Escreva sua resposta..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={sendManualReply}
                  disabled={sendingReply || selectedQuestion.status === "ANSWERED"}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={14} />
                  {sendingReply ? "Enviando..." : "Enviar resposta"}
                </button>
                <button
                  type="button"
                  onClick={openSelectedQuestionListing}
                  disabled={!selectedQuestion.item_id}
                  className="ml-auto p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  title="Abrir anúncio da pergunta selecionada"
                  aria-label="Abrir anúncio da pergunta selecionada"
                >
                  <ExternalLink size={16} />
                </button>
                {templates
                  .filter((t) => t.isActive)
                  .slice(0, 3)
                  .map((t) => (
                    <div key={t._id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => insertTemplateInReply(t.content)}
                        disabled={selectedQuestion.status === "ANSWERED"}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-50"
                        title={t.content}
                      >
                        Inserir: {t.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => sendTemplateReply(t._id)}
                        disabled={sendingReply || selectedQuestion.status === "ANSWERED"}
                        className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs disabled:opacity-50"
                      >
                        Enviar
                      </button>
                    </div>
                  ))}
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
              <div key={t._id} className="p-3 flex flex-wrap items-center gap-2 justify-between">
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
                    <div className="min-w-0">
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
    </div>
  );
}
