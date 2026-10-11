import { ArrowDown, ArrowUp, Inbox, Loader2, Search, SearchX, X } from "lucide-react";
import { getInitials, escapeRegex } from "./utils";

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

/**
 * Há quanto tempo a pergunta pendente mais antiga espera resposta.
 * Cor indica urgência: até 1h ciano, até 12h âmbar, acima disso vermelho.
 */
function waitingInfo(conv) {
  if (!conv.unansweredCount) return null;
  const oldest = conv.questions
    .filter((q) => q.status === "UNANSWERED")
    .reduce((min, q) => (!min || q.date_created < min ? q.date_created : min), null);
  if (!oldest) return null;
  const hours = (Date.now() - new Date(oldest).getTime()) / 3_600_000;
  const tone = hours < 1 ? "glow" : hours < 12 ? "warn" : "danger";
  return { label: formatRelativeTime(oldest), tone };
}

const WAIT_TONE = {
  glow:   "text-glow bg-glow/10 ring-glow/30",
  warn:   "text-warn bg-warn/10 ring-warn/30",
  danger: "text-danger bg-danger/10 ring-danger/30",
};

/** Destaca as ocorrências do termo no texto (estilo busca do WhatsApp) */
function Highlight({ text, term }) {
  const str = String(text ?? "");
  if (!term) return str;
  const parts = str.split(new RegExp(`(${escapeRegex(term)})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase()
      ? <mark key={i} className="bg-glow/25 text-fg rounded px-0.5">{part}</mark>
      : part
  );
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
  searchInput,
  setSearchInput,
  searchTerm,
  searching,
}) {
  const isSearching = !!searchTerm;

  return (
    <section className="glass rounded-2xl lg:col-span-2 xl:col-span-2 flex flex-col overflow-hidden h-72 shrink-0 lg:h-auto lg:shrink">
      <div className="px-4 pt-4 pb-3 border-b border-line/10 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold text-fg text-base">Conversas</h2>
            {selectedAccount && (
              <p className="text-xs text-fg-dim mt-0.5 truncate">
                {selectedAccount.nickname || selectedAccount.user_id}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSortOrder((s) => (s === "desc" ? "asc" : "desc"))}
            title={sortOrder === "desc" ? "Mais novas primeiro" : "Mais antigas primeiro"}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-fg-muted hover:text-fg hover:bg-ink/[0.05] transition-colors"
          >
            {sortOrder === "desc" ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
            {sortOrder === "desc" ? "Recentes" : "Antigas"}
          </button>
        </div>

        {/* Busca global de mensagens */}
        <div className="relative">
          {searching ? (
            <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-glow animate-spin" />
          ) : (
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
          )}
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={!selectedUserId}
            placeholder="Buscar em todas as conversas"
            className="field !pl-9 !pr-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              title="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-fg-dim hover:text-fg transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {!selectedUserId ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-fg-dim text-center">Selecione uma conta para ver as conversas.</p>
        </div>
      ) : (loadingQuestions || searching) && conversations.length === 0 ? (
        <div className="flex-1 space-y-1 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-xl p-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-ink/[0.06]" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-1/2 animate-pulse rounded bg-ink/[0.06]" />
                <div className="h-2.5 w-4/5 animate-pulse rounded bg-ink/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line/15 bg-ink/[0.03] text-fg-dim">
            {isSearching ? <SearchX size={20} /> : <Inbox size={20} />}
          </div>
          <p className="text-sm text-fg-muted max-w-[220px]">
            {isSearching
              ? <>Nenhuma mensagem com <span className="font-medium text-fg">"{searchTerm}"</span>.</>
              : "Nenhuma conversa aqui. Novas perguntas aparecem automaticamente."}
          </p>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
          {conversations.map((conv) => {
            const isSelected = String(conv.from_id) === String(selectedConversationFromId);
            const initials = getInitials(conv.from_nickname);
            const preview = isSearching && conv.matchSnippet ? conv.matchSnippet : conv.lastQuestionText;
            const waiting = waitingInfo(conv);
            const pending = conv.unansweredCount > 0;
            return (
              <button
                key={conv.from_id}
                type="button"
                onClick={() => onSelectConversation(conv.from_id)}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "group w-full text-left rounded-xl px-3 py-3 transition-colors duration-150 relative",
                  isSelected
                    ? "bg-gradient-to-r from-brandSolid-500/20 to-brandSolid-500/[0.04] ring-1 ring-inset ring-brandSolid-400/30"
                    : "hover:bg-ink/[0.04]"
                )}
              >
                {isSelected && (
                  <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-glow shadow-[0_0_10px_rgb(var(--glow)/0.8)]" />
                )}
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold select-none",
                        pending
                          ? "bg-gradient-to-br from-brandSolid-400 to-brandSolid-700 text-white ring-2 ring-warn/60 ring-offset-2 ring-offset-[rgb(var(--surface))]"
                          : "bg-ink/[0.07] text-fg-muted"
                      )}
                    >
                      {initials}
                    </div>
                    {pending && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-semibold flex items-center justify-center leading-none shadow-[0_0_10px_rgb(var(--danger)/0.8)]">
                        {conv.unansweredCount > 9 ? "9+" : conv.unansweredCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-sm truncate", pending ? "font-semibold text-fg" : "font-medium text-fg/85")}>
                        <Highlight text={conv.from_nickname || `Comprador #${conv.from_id}`} term={searchTerm} />
                      </span>
                      {waiting ? (
                        <span
                          className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset num", WAIT_TONE[waiting.tone])}
                          title="Tempo aguardando resposta"
                        >
                          {waiting.label}
                        </span>
                      ) : (
                        <span className="text-[11px] text-fg-dim shrink-0 num">{formatRelativeTime(conv.lastDate)}</span>
                      )}
                    </div>
                    {conv.item_title && (
                      <p className="text-xs text-brandSolid-300/90 truncate mt-0.5">{conv.item_title}</p>
                    )}
                    <p className={cn("text-xs line-clamp-1 mt-0.5", pending ? "text-fg-muted" : "text-fg-dim")}>
                      <Highlight text={preview} term={searchTerm} />
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
