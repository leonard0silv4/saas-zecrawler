import { Loader2, MessageSquare } from "lucide-react";

function cn(...c) { return c.filter(Boolean).join(" "); }

function getInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

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
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 lg:col-span-2 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Conversas</h2>
          {selectedAccount && (
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedAccount.nickname || selectedAccount.user_id}
            </p>
          )}
        </div>
        {conversations.length > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full tabular-nums">
            {conversations.length}
          </span>
        )}
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
        <div className="overflow-y-auto max-h-[600px] divide-y divide-gray-50">
          {conversations.map((conv) => {
            const isSelected = conv.from_id === selectedConversationFromId;
            const initials = getInitials(conv.from_nickname);
            return (
              <button
                key={conv.from_id}
                type="button"
                onClick={() => onSelectConversation(conv.from_id)}
                className={cn(
                  "w-full text-left px-4 py-3 transition-colors relative border-l-[3px]",
                  isSelected
                    ? "bg-brand-50 border-l-brand-600"
                    : "hover:bg-gray-50 border-l-transparent"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0 mt-0.5">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold select-none">
                      {initials}
                    </div>
                    {conv.unansweredCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                        {conv.unansweredCount > 9 ? "9+" : conv.unansweredCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span className={cn(
                        "text-sm truncate",
                        conv.unansweredCount > 0
                          ? "font-semibold text-gray-900"
                          : "font-medium text-gray-700"
                      )}>
                        {conv.from_nickname || `Comprador #${conv.from_id}`}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                        {formatRelativeTime(conv.lastDate)}
                      </span>
                    </div>
                    {conv.item_title && (
                      <p className="text-[10px] text-brand-600 truncate mb-0.5 font-medium">
                        {conv.item_title}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 line-clamp-1">
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
