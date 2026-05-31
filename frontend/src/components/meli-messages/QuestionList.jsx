import { Loader2, Check, Trash2 } from "lucide-react";

function cn(...c) { return c.filter(Boolean).join(" "); }

function formatRelativeTime(value) {
  if (!value) return "";
  const diffMins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

export function QuestionList({ selectedUserId, loadingQuestions, questions, selectedQuestionId, setSelectedQuestionId, setReplyText, setDeleteQuestionModal, selectedAccount }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 lg:col-span-2">
      <h2 className="font-semibold text-gray-900 mb-1">Perguntas</h2>
      <p className="text-xs text-gray-500 mb-3">
        {selectedAccount ? `Conta: ${selectedAccount.nickname || selectedAccount.user_id}` : "Selecione uma conta"}
      </p>
      {!selectedUserId ? (
        <p className="text-sm text-gray-500">Conecte e selecione uma conta para listar perguntas.</p>
      ) : loadingQuestions && questions.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin text-gray-300" />
        </div>
      ) : questions.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma pergunta para os filtros atuais.</p>
      ) : (
        <div className="max-h-[560px] overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
          {questions.map((q) => (
            <div
              key={q.question_id}
              className={cn("relative group", selectedQuestionId === q.question_id ? "bg-brand-50" : "hover:bg-gray-50")}
            >
              <button
                type="button"
                onClick={() => { setSelectedQuestionId(q.question_id); setReplyText(""); }}
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
  );
}
