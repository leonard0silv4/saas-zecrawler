import { Store, Clock, CheckCircle2 } from "lucide-react";

function cn(...c) { return c.filter(Boolean).join(" "); }

export function AccountSelector({
  accounts,
  selectedUserId,
  setSelectedUserId,
  hasDotForUserId,
  statusFilter,
  setStatusFilter,
  questionsCount,
  inline,
}) {
  function renderPill(account, small) {
    const uid = String(account.user_id);
    const hasDot = hasDotForUserId(uid);
    const isActive = selectedUserId === uid;
    return (
      <button
        key={account.user_id}
        type="button"
        onClick={() => setSelectedUserId(uid)}
        className={cn(
          "relative font-medium transition-all duration-200",
          small ? "px-3 py-1.5 rounded-full text-xs" : "px-4 py-2.5 rounded-lg text-sm",
          isActive
            ? "bg-brand-600 text-white shadow-md hover:bg-brand-700"
            : small
            ? "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
            : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:border-gray-300"
        )}
      >
        {account.nickname || account.user_id}
        {hasDot && (
          <span
            className={cn(
              "absolute rounded-full bg-red-500 border-white",
              small ? "-top-0.5 -right-0.5 w-2 h-2 border" : "-top-0.5 -right-0.5 w-2.5 h-2.5 border-2"
            )}
          />
        )}
      </button>
    );
  }

  if (inline) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {accounts.map((a) => renderPill(a, true))}
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2.5">
            <Store size={16} /> Conta
          </span>
          <div className="flex flex-wrap gap-2.5">
            {accounts.map((a) => renderPill(a, false))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("UNANSWERED")}
          className={cn(
            "px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 flex items-center gap-2.5",
            statusFilter === "UNANSWERED"
              ? "bg-brand-50 border-brand-300 text-brand-700 shadow-sm"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
          )}
        >
          <Clock size={16} /> Pendentes
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("ANSWERED")}
          className={cn(
            "px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 flex items-center gap-2.5",
            statusFilter === "ANSWERED"
              ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
          )}
        >
          <CheckCircle2 size={16} /> Respondidas
        </button>
        <span className="ml-auto text-xs font-semibold px-3 py-2 rounded-lg bg-gray-50 text-gray-700 border border-gray-200">
          {questionsCount} {questionsCount === 1 ? "pergunta" : "perguntas"}
        </span>
      </div>
    </>
  );
}
