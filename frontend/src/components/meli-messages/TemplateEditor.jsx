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
    <section className="bg-surface-2 rounded-lg border border-line/15 p-5 sm:p-6 space-y-4 shadow-sm">
      <h2 className="font-bold text-fg text-base">Templates de resposta</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="field"
          placeholder="Nome do template"
          value={newTemplateName}
          onChange={(e) => setNewTemplateName(e.target.value)}
        />
        <input
          className="field md:col-span-2"
          placeholder="Conteúdo do template"
          value={newTemplateContent}
          onChange={(e) => setNewTemplateContent(e.target.value)}
        />
      </div>
      <button
        type="button"
        onClick={createTemplate}
        disabled={savingTemplate}
        className="px-5 py-2.5 rounded-lg bg-brandSolid-500 text-white text-sm font-bold flex items-center gap-2.5 disabled:opacity-50 hover:bg-brandSolid-400 active:bg-brand-800 transition-all duration-200 hover:shadow-md shadow-glow-brand"
      >
        {savingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {savingTemplate ? "Salvando…" : "Criar template"}
      </button>

      {templates.length > 0 && (
        <div className="border border-line/15 rounded-lg divide-y divide-line/10">
          {templates.map((t) => (
            <div key={t._id} className="p-4 flex items-center gap-3 justify-between">
              {editingTemplateId === t._id ? (
                <div className="w-full space-y-3">
                  <input
                    className="field w-full"
                    value={editingTemplateName}
                    onChange={(e) => setEditingTemplateName(e.target.value)}
                  />
                  <input
                    className="field w-full"
                    value={editingTemplateContent}
                    onChange={(e) => setEditingTemplateContent(e.target.value)}
                  />
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={saveTemplateEdit}
                      disabled={savingTemplate}
                      className="px-4 py-2 rounded-lg bg-brandSolid-500 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 hover:bg-brandSolid-400 transition-all duration-200 shadow-glow-brand"
                    >
                      {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {savingTemplate ? "Salvando…" : "Salvar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTemplateId(null)}
                      className="px-4 py-2 rounded-lg border border-line/25 text-fg/90 text-sm font-medium flex items-center gap-1.5 hover:bg-ink/[0.03] transition-colors duration-200"
                    >
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">
                      {t.name} {!t.isActive && <span className="text-xs text-fg-muted">(inativo)</span>}
                    </p>
                    <p className="text-xs text-fg-muted line-clamp-2 mt-0.5">{t.content}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => insertTemplateInReply(t.content)}
                      className="px-3 py-2 rounded-lg border border-line/25 text-fg/90 text-xs font-medium hover:bg-ink/[0.03] transition-colors duration-200"
                    >
                      Inserir
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditTemplate(t)}
                      className="px-3 py-2 rounded-lg border border-line/25 text-fg/90 text-xs font-medium flex items-center gap-1.5 hover:bg-ink/[0.03] transition-colors duration-200"
                    >
                      <Pencil size={13} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t._id)}
                      disabled={deletingTemplateId === t._id}
                      className="px-3 py-2 rounded-lg border border-danger/50 text-danger text-xs font-medium flex items-center gap-1.5 hover:bg-danger/10 transition-colors duration-200 disabled:opacity-50"
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
