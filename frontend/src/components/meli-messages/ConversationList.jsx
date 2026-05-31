import { useMemo, useState } from "react";
import { ArrowDownUp, Loader2, MessageSquare } from "lucide-react";
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
  statusFilter,
}) {
  const [sortOrder, setSortOrder] = useState("desc");

  const sorted = useMemo(() => {
    if (sortOrder === "asc") return [...conversations].sort((a, b) => (a.lastDate > b.lastDate ? 1 : -1));
    return conversations;
  }, [conversations, sortOrder]);

  const headerLabel = statusFilter === "ANSWERED" ? "Respondidas" : "Fila de Espera";

  return (
    <div className="w-72 shrink-0 border-r border-gray-200 flex flex-col h-full overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{headerLabel}</span>
          {conversations.length > 0 && (
            <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full tabular-nums">
              {conversations.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSortOrder((s) => (s === "desc" ? "asc" : "desc"))}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150"
          title={sortOrder === "desc" ? "Mais recente primeiro" : "Mais antigo primeiro"}
        >
          <ArrowDownUp size={13} />
        </button>
      </div>

      {!selectedUserId ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-gray-400 text-center">Selecione uma conta para ver as conversas.</p>
        </div>
      ) : loadingQuestions && conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-2">
          <MessageSquare size={26} className="text-gray-200" />
          <p className="text-sm text-gray-400">Nenhuma conversa encontrada.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {sorted.map((conv) => {
            const isSelected = conv.from_id === selectedConversationFromId;
            const initials = getInitials(conv.from_nickname);
            return (
              <button
                key={conv.from_id}
                type="button"
                onClick={() => onSelectConversation(conv.from_id)}
                className={cn(
                  "w-full text-left px-4 py-3 transition-all duration-200 relative border-l-2",
                  isSelected
                    ? "bg-brand-50 border-l-brand-600"
                    : "hover:bg-gray-50 border-l-transparent"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className="relative shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold select-none border border-brand-200">
                      {initials}
                    </div>
                    {conv.unansweredCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none shadow border border-white">
                        {conv.unansweredCount > 9 ? "9+" : conv.unansweredCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span
                        className={cn(
                          "text-sm truncate",
                          conv.unansweredCount > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"
                        )}
                      >
                        {conv.from_nickname || `Comprador #${conv.from_id}`}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0 tabular-nums">
                        {formatRelativeTime(conv.lastDate)}
                      </span>
                    </div>
                    {conv.item_title && (
                      <p className="text-xs text-brand-700 truncate mb-0.5 font-semibold">
                        {conv.item_title}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-1">{conv.lastQuestionText}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
