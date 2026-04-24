import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, RefreshCcw, Send } from "lucide-react";
import api from "../services/api";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
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
    if (!selectedUserId) {
      setProducts([]);
      return;
    }
    setLoadingProducts(true);
    try {
      const { data } = await api.get("/meli/products/autocomplete", {
        params: { user_id: selectedUserId, q: query },
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
    if (!selectedUserId) return;
    const handle = setTimeout(() => {
      loadProducts(productSearch);
    }, 300);
    return () => clearTimeout(handle);
  }, [selectedUserId, productSearch]);

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="text-brand-600" />
          Mensagens Mercado Livre
        </h1>
        <p className="text-gray-500 mt-1">
          Liste perguntas por conta conectada, responda manualmente e use templates 1 clique.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Conta conectada</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[220px]"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.nickname || a.user_id} ({a.user_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Status</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="UNANSWERED">Não respondidas</option>
              <option value="ANSWERED">Respondidas</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadQuestions}
            disabled={loadingQuestions || !selectedUserId}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {loadingQuestions ? "Carregando..." : "Atualizar lista"}
          </button>

          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw size={14} />
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Perguntas</h2>
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
                  className={`w-full text-left p-3 hover:bg-gray-50 transition ${selectedQuestionId === q.question_id ? "bg-brand-50" : ""}`}
                >
                  <p className="text-xs text-gray-500 mb-1">
                    #{q.question_id} · {q.status} · {formatDate(q.date_created)}
                  </p>
                  <p className="text-sm text-gray-900 font-medium line-clamp-2">{q.item_title || q.item_id || "Sem item"}</p>
                  <p className="text-sm text-gray-700 mt-1 line-clamp-3">{q.text}</p>
                  {q.answer_text && <p className="text-xs text-emerald-700 mt-2 line-clamp-2">Resposta: {q.answer_text}</p>}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 space-y-4">
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
                <label className="text-xs text-gray-500 block mb-1">
                  Link do anúncio (autocomplete de produtos da conta)
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
                {!loadingProducts && filteredProducts.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Nenhum produto encontrado para esta conta. Digite mais termos ou sincronize os produtos.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Resposta manual</label>
                <textarea
                  ref={replyTextareaRef}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[140px]"
                  placeholder="Escreva sua resposta..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={sendManualReply}
                  disabled={sendingReply || selectedQuestion.status === "ANSWERED"}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={14} />
                  {sendingReply ? "Enviando..." : "Enviar manual"}
                </button>
                {templates
                  .filter((t) => t.isActive)
                  .slice(0, 4)
                  .map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => sendTemplateReply(t._id)}
                      disabled={sendingReply || selectedQuestion.status === "ANSWERED"}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-50"
                      title={t.content}
                    >
                      Template: {t.name}
                    </button>
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
        <button
          type="button"
          onClick={createTemplate}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium"
        >
          Criar template
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
                      <button type="button" onClick={saveTemplateEdit} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs">
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTemplateId(null)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                      >
                        Cancelar
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
                        onClick={() => startEditTemplate(t)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(t._id)}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs"
                      >
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
