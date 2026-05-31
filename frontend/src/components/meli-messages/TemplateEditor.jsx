import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

export function TemplateEditor({
  templates,
  newTemplateName, setNewTemplateName,
  newTemplateContent, setNewTemplateContent,
  createTemplate, savingTemplate,
  editingTemplateId, setEditingTemplateId,
  editingTemplateName, setEditingTemplateName,
  editingTemplateContent, setEditingTemplateContent,
  saveTemplateEdit,
  deleteTemplate, deletingTemplateId,
  insertTemplateInReply,
  startEditTemplate,
}) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-5 sm:p-6 space-y-4 shadow-sm">
      <h2 className="font-bold text-gray-900 text-base">Templates de resposta</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200 placeholder-gray-400"
          placeholder="Nome do template"
          value={newTemplateName}
          onChange={(e) => setNewTemplateName(e.target.value)}
        />
        <input
          className="md:col-span-2 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200 placeholder-gray-400"
          placeholder="Conteúdo do template"
          value={newTemplateContent}
          onChange={(e) => setNewTemplateContent(e.target.value)}
        />
      </div>
      <button
        type="button"
        onClick={createTemplate}
        disabled={savingTemplate}
        className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-bold flex items-center gap-2.5 disabled:opacity-50 hover:bg-brand-700 active:bg-brand-800 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        {savingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {savingTemplate ? "Salvando…" : "Criar template"}
      </button>

      {templates.length > 0 && (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {templates.map((t) => (
            <div key={t._id} className="p-4 flex items-center gap-3 justify-between">
              {editingTemplateId === t._id ? (
                <div className="w-full space-y-3">
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200"
                    value={editingTemplateName}
                    onChange={(e) => setEditingTemplateName(e.target.value)}
                  />
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200"
                    value={editingTemplateContent}
                    onChange={(e) => setEditingTemplateContent(e.target.value)}
                  />
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={saveTemplateEdit}
                      disabled={savingTemplate}
                      className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 hover:bg-brand-700 transition-all duration-200"
                    >
                      {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {savingTemplate ? "Salvando…" : "Salvar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTemplateId(null)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium flex items-center gap-1.5 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {t.name} {!t.isActive && <span className="text-xs text-gray-500">(inativo)</span>}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{t.content}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => insertTemplateInReply(t.content)}
                      className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors duration-200"
                    >
                      Inserir
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditTemplate(t)}
                      className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <Pencil size={13} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t._id)}
                      disabled={deletingTemplateId === t._id}
                      className="px-3 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-medium flex items-center gap-1.5 hover:bg-red-50 transition-colors duration-200 disabled:opacity-50"
                    >
                      {deletingTemplateId === t._id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      {deletingTemplateId === t._id ? "Excluindo…" : "Excluir"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
