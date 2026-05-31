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
        disabled={savingTemplate}
        className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-60"
      >
        {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {savingTemplate ? "Salvando…" : "Criar template"}
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
                    <button
                      type="button"
                      onClick={saveTemplateEdit}
                      disabled={savingTemplate}
                      className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs flex items-center gap-1 disabled:opacity-60"
                    >
                      {savingTemplate ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      {savingTemplate ? "Salvando…" : "Salvar"}
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
                      disabled={deletingTemplateId === t._id}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs flex items-center gap-1 disabled:opacity-60"
                    >
                      {deletingTemplateId === t._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
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
