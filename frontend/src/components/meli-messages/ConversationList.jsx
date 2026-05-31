import { ArrowDown, ArrowUp, Loader2, MessageSquare } from "lucide-react";
import { getInitials } from "./utils";

function cn(...c) { return c.filter(Boolean).join(" "); }

function formatRelativeTime(value) {
  if (!value) return "";
  const diffMins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ConversationList({
  conversations,
  selectedConversationFromId,
  onSelectConversation,
  loadingQuestions,
  selectedUserId,
  selectedAccount,
  sortOrder,
  setSortOrder,
}) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 lg:col-span-2 flex flex-col overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-bold text-gray-900 text-base">Conversas</h2>
          {selectedAccount && (
            <p className="text-xs text-gray-500 mt-1">
              {selectedAccount.nickname || selectedAccount.user_id}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortOrder((s) => (s === "desc" ? "asc" : "desc"))}
            title={sortOrder === "desc" ? "Mais novas primeiro" : "Mais antigas primeiro"}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
          >
            {sortOrder === "desc" ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
          </button>
          {conversations.length > 0 && (
            <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full tabular-nums">
              {conversations.length}
            </span>
          )}
        </div>
      </div>

      {!selectedUserId ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-gray-400 text-center">
            Selecione uma conta para ver as conversas.
          </p>
        </div>
      ) : loadingQuestions && conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-2">
          <MessageSquare size={28} className="text-gray-200" />
          <p className="text-sm text-gray-400">Nenhuma conversa encontrada.</p>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1">
          {conversations.map((conv) => {
            const isSelected = String(conv.from_id) === String(selectedConversationFromId);
            const initials = getInitials(conv.from_nickname);
            return (
              <button
                key={conv.from_id}
                type="button"
                onClick={() => onSelectConversation(conv.from_id)}
                className={cn(
                  "w-full text-left px-5 py-4 transition-all duration-200 relative border-l-4 border-b border-b-gray-100 last:border-b-0",
                  isSelected
                    ? "bg-brand-50 border-l-brand-600 shadow-sm"
                    : "hover:bg-gray-50 border-l-transparent hover:shadow-sm"
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold select-none border border-brand-200">
                      {initials}
                    </div>
                    {conv.unansweredCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-md border border-white">
                        {conv.unansweredCount > 9 ? "9+" : conv.unansweredCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className={cn(
                        "text-sm truncate",
                        conv.unansweredCount > 0
                          ? "font-bold text-gray-900"
                          : "font-semibold text-gray-800"
                      )}>
                        {conv.from_nickname || `Comprador #${conv.from_id}`}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0 tabular-nums font-medium">
                        {formatRelativeTime(conv.lastDate)}
                      </span>
                    </div>
                    {conv.item_title && (
                      <p className="text-xs text-brand-700 truncate mb-1 font-semibold">
                        {conv.item_title}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 line-clamp-1">
                      {conv.lastQuestionText}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
