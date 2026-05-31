import { useState } from "react";
import { Check, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Modal } from "../ui/Modal";

function cn(...c) { return c.filter(Boolean).join(" "); }

export function TemplateModal({
  open,
  onClose,
  templates,
  onInsert,
  // CRUD handlers
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
  const [tab, setTab] = useState("use");
  const [search, setSearch] = useState("");

  const activeTemplates = templates.filter((t) => t.isActive);
  const filtered = search.trim()
    ? activeTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.content.toLowerCase().includes(search.toLowerCase())
      )
    : activeTemplates;

  function handleInsert(content) {
    onInsert(content);
    onClose();
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Templates" size="md">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setTab("use")}
          className={cn(
            "flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
            tab === "use"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Templates
        </button>
        <button
          type="button"
          onClick={() => setTab("manage")}
          className={cn(
            "flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
            tab === "manage"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Gerenciar
        </button>
      </div>

      {tab === "use" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all placeholder-gray-400"
              placeholder="Buscar template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Template list */}
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {search ? "Nenhum template encontrado." : "Nenhum template ativo cadastrado."}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => handleInsert(t.content)}
                  className="w-full text-left p-3.5 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full font-mono">
                      #{t.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed group-hover:text-gray-900 transition-colors">
                    {t.content}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "manage" && (
        <div className="space-y-5">
          {/* New template form */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Novo template</p>
            <input
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all placeholder-gray-400"
              placeholder="Nome do atalho (ex: bom_dia)"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
            />
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all placeholder-gray-400 resize-none min-h-[80px]"
              placeholder="Conteúdo do template..."
              value={newTemplateContent}
              onChange={(e) => setNewTemplateContent(e.target.value)}
            />
            <button
              type="button"
              onClick={createTemplate}
              disabled={savingTemplate}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-brand-700 transition-all duration-200 shadow-sm"
            >
              {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {savingTemplate ? "Salvando…" : "Criar template"}
            </button>
          </div>

          {/* Template list */}
          {templates.length > 0 && (
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {templates.map((t) => (
                <div key={t._id} className="p-4">
                  {editingTemplateId === t._id ? (
                    <div className="space-y-3">
                      <input
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all"
                        value={editingTemplateName}
                        onChange={(e) => setEditingTemplateName(e.target.value)}
                      />
                      <textarea
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all resize-none min-h-[70px]"
                        value={editingTemplateContent}
                        onChange={(e) => setEditingTemplateContent(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveTemplateEdit}
                          disabled={savingTemplate}
                          className="px-3.5 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 hover:bg-brand-700 transition-all"
                        >
                          {savingTemplate ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          {savingTemplate ? "Salvando…" : "Salvar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTemplateId(null)}
                          className="px-3.5 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
                        >
                          <X size={13} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full font-mono">
                            #{t.name}
                          </span>
                          {!t.isActive && (
                            <span className="text-[10px] text-gray-400 font-medium">(inativo)</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{t.content}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditTemplate(t)}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(t._id)}
                          disabled={deletingTemplateId === t._id}
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-all disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletingTemplateId === t._id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {templates.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum template cadastrado.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
