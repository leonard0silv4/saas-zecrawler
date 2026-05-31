import { useMemo, useState } from "react";
import { Check, Hash, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Modal } from "../ui/Modal";

function cn(...c) { return c.filter(Boolean).join(" "); }

export function TemplateModal({
  open,
  onClose,
  templates,
  onInsert,
  newTemplateName, setNewTemplateName,
  newTemplateContent, setNewTemplateContent,
  createTemplate, savingTemplate,
  editingTemplateId, setEditingTemplateId,
  editingTemplateName, setEditingTemplateName,
  editingTemplateContent, setEditingTemplateContent,
  saveTemplateEdit,
  deleteTemplate, deletingTemplateId,
  startEditTemplate,
}) {
  const [tab, setTab] = useState("usar");
  const [search, setSearch] = useState("");

  const activeTemplates = useMemo(() => templates.filter((t) => t.isActive), [templates]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return activeTemplates;
    return activeTemplates.filter(
      (t) => t.name.toLowerCase().includes(s) || t.content.toLowerCase().includes(s)
    );
  }, [activeTemplates, search]);

  function handleInsert(content) {
    onInsert(content);
    onClose();
  }

  function handleClose() {
    setSearch("");
    onClose();
  }

  return (
    <Modal isOpen={open} onClose={handleClose} size="lg" title="Templates de Resposta">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        {[
          { key: "usar", label: "Usar template" },
          { key: "gerenciar", label: "Gerenciar" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
              tab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Usar ── */}
      {tab === "usar" && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 focus:bg-white transition-all duration-200 placeholder-gray-400"
              placeholder="Filtrar templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              {activeTemplates.length === 0 ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Hash size={20} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Nenhum template criado ainda.</p>
                  <button
                    type="button"
                    onClick={() => setTab("gerenciar")}
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Criar meu primeiro template →
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500">Nenhum resultado para &ldquo;{search}&rdquo;.</p>
                  <button type="button" onClick={() => setSearch("")} className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">
                    Limpar busca
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {filtered.map((t) => (
                <div
                  key={t._id}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/40 transition-all duration-150"
                >
                  <span className="shrink-0 mt-0.5 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold whitespace-nowrap">
                    <Hash size={9} strokeWidth={2.5} />
                    {t.name}
                  </span>
                  <p className="flex-1 text-sm text-gray-600 line-clamp-2 min-w-0 leading-snug">
                    {t.content}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleInsert(t.content)}
                    className="shrink-0 px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 active:bg-brand-800 transition-all duration-150 shadow-sm hover:shadow-md"
                  >
                    Inserir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Gerenciar ── */}
      {tab === "gerenciar" && (
        <div className="space-y-5">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Novo template</p>
            <div className="grid grid-cols-3 gap-2.5">
              <input
                className="col-span-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200 placeholder-gray-400 bg-white"
                placeholder="Nome (ex: saudacao)"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
              <input
                className="col-span-2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200 placeholder-gray-400 bg-white"
                placeholder="Conteúdo do template"
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={createTemplate}
              disabled={savingTemplate || !newTemplateName.trim() || !newTemplateContent.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-brand-700 active:bg-brand-800 transition-all duration-200 shadow-sm"
            >
              {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {savingTemplate ? "Criando…" : "Criar template"}
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">Nenhum template ainda. Crie o primeiro acima.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {templates.map((t) => (
                <div key={t._id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {editingTemplateId === t._id ? (
                    <div className="p-4 space-y-2.5 bg-brand-50/30">
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200 bg-white"
                        value={editingTemplateName}
                        onChange={(e) => setEditingTemplateName(e.target.value)}
                        placeholder="Nome"
                      />
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200 bg-white"
                        value={editingTemplateContent}
                        onChange={(e) => setEditingTemplateContent(e.target.value)}
                        placeholder="Conteúdo"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveTemplateEdit}
                          disabled={savingTemplate}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-brand-700 transition-all duration-200"
                        >
                          {savingTemplate ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTemplateId(null)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                        >
                          <X size={13} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="shrink-0 text-xs font-bold text-brand-700">
                        #{t.name}
                        {!t.isActive && <span className="ml-1 text-gray-400 font-normal">(inativo)</span>}
                      </span>
                      <p className="flex-1 text-sm text-gray-600 line-clamp-1 min-w-0">{t.content}</p>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditTemplate(t)}
                          className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all duration-150"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(t._id)}
                          disabled={deletingTemplateId === t._id}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150 disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletingTemplateId === t._id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
