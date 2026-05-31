import { Store, Clock, CheckCircle2 } from "lucide-react";

function cn(...c) { return c.filter(Boolean).join(" "); }

export function AccountSelector({ accounts, selectedUserId, setSelectedUserId, hasDotForUserId, statusFilter, setStatusFilter, questionsCount }) {
  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Store size={14} /> Conta:
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
          {questionsCount} {questionsCount === 1 ? "pergunta" : "perguntas"}
        </span>
      </div>
    </>
  );
}
