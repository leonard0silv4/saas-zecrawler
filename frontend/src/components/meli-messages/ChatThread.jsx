import { useEffect, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ExternalLink,
  Hash,
  Loader2,
  MessageSquare,
  Package,
  Send,
  ShoppingBag,
  Trash2,
  Zap,
} from "lucide-react";
import { getInitials } from "./utils";

function cn(...c) { return c.filter(Boolean).join(" "); }

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price) {
  if (price == null) return null;
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  paused: "bg-amber-100 text-amber-700 border-amber-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_DOT = {
  active: "bg-emerald-400",
  paused: "bg-amber-400",
  closed: "bg-gray-400",
};

const STATUS_LABEL = {
  active: "Ativo",
  paused: "Pausado",
  closed: "Encerrado",
};

function ItemContextCard({ itemId, itemTitle, itemStatus, listingProductsMap, onOpenListing }) {
  const product = listingProductsMap?.get(itemId);
  const title = product?.title || itemTitle || itemId;
  const price = product?.price ?? null;
  const status = product?.status || itemStatus || null;
  const thumbnail = product?.thumbnail || null;
  const permalink = product?.permalink || null;

  return (
    <div className="flex flex-col items-center gap-1.5 py-3 px-4">
      {/* Divider label */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none whitespace-nowrap">
          Sobre este anúncio
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Compact product card */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 shadow-sm max-w-sm w-full hover:border-gray-300 transition-colors duration-150">
        {/* Thumbnail */}
        <div className="w-10 h-10 shrink-0 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <Package size={18} className="text-gray-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800  leading-tight">{title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {status && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                STATUS_BADGE[status] || "bg-gray-100 text-gray-600 border-gray-200"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[status] || "bg-gray-400")} />
                {STATUS_LABEL[status] || status}
              </span>
            )}
            {price != null && (
              <span className="text-[11px] font-bold text-gray-700">{formatPrice(price)}</span>
            )}
            {product?.available_quantity != null && (
              <span className="text-[11px] text-gray-500 font-medium">
                {product.available_quantity} em estoque
              </span>
            )}
          </div>
        </div>

        {/* External link */}
        <button
          type="button"
          onClick={() => permalink ? window.open(permalink, "_blank", "noopener,noreferrer") : onOpenListing?.()}
          disabled={!permalink && !itemId}
          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all duration-150 disabled:opacity-30"
          title="Abrir no Mercado Livre"
        >
          <ExternalLink size={13} />
        </button>
      </div>
    </div>
  );
}

export function ChatThread({
  selectedConversation,
  activeQuestion,
  listingProductsMap,
  buyerThread,
  loadingBuyerThread,
  replyText,
  hashAnchorRef,
  replyTextareaRef,
  hashDropdownOpen,
  hashSuggestions,
  hashDropdownIndex,
  smartSuggestions,
  sendingReply,
  handleReplyChange,
  handleReplyKeyDown,
  applySuggestion,
  applyHashTemplate,
  onRequestSend,
  openSelectedQuestionListing,
  setDeleteQuestionModal,
  onOpenTemplates,
  onOpenProducts,
  threadSortOrder,
  setThreadSortOrder,
}) {
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [buyerThread, selectedConversation?.from_id]);

  if (!selectedConversation) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 lg:col-span-3 flex items-center justify-center shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <MessageSquare size={32} className="text-gray-300" />
          <p className="text-sm text-gray-500">Selecione uma conversa para começar.</p>
        </div>
      </section>
    );
  }

  const buyerName = selectedConversation.from_nickname || `Comprador #${selectedConversation.from_id}`;
  const initials = getInitials(buyerName);
  const allAnswered = activeQuestion?.status !== "UNANSWERED";

  const sortedThread = [...buyerThread].sort((a, b) =>
    threadSortOrder === "asc"
      ? new Date(a.date_created) - new Date(b.date_created)
      : new Date(b.date_created) - new Date(a.date_created)
  );

  return (
    <section className="bg-white rounded-lg border border-gray-200 lg:col-span-3 flex flex-col overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3.5 shrink-0">
        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0 select-none border border-brand-200">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{buyerName}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500">
              {buyerThread.length} {buyerThread.length === 1 ? "interação" : "interações"}
              {selectedConversation.unansweredCount > 0 && (
                <span className="ml-2 text-amber-700 font-medium">
                  · {selectedConversation.unansweredCount} pendente{selectedConversation.unansweredCount > 1 ? "s" : ""}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setThreadSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
              title={threadSortOrder === "asc" ? "Mais antigas primeiro" : "Mais novas primeiro"}
              className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors duration-150"
            >
              {threadSortOrder === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
              {threadSortOrder === "asc" ? "Mais antigas" : "Mais novas"}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            activeQuestion &&
            setDeleteQuestionModal({
              question_id: activeQuestion.question_id,
              text: activeQuestion.text,
              status: activeQuestion.status,
            })
          }
          disabled={!activeQuestion}
          className="p-2 rounded-lg border border-red-200 text-red-500 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-all duration-200 disabled:opacity-40"
          title="Excluir pergunta ativa do sistema"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Chat bubbles */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-5 min-h-0">
        {loadingBuyerThread ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        ) : sortedThread.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">
            Sem histórico de mensagens para este comprador.
          </p>
        ) : (
          (() => {
            let prevItemId = null;
            return sortedThread.map((item) => {
              const showContextCard = item.item_id !== prevItemId;
              prevItemId = item.item_id;
              const isActive = item.question_id === activeQuestion?.question_id;

              return (
                <div key={item.question_id}>
                  {/* ItemContextCard quando o anúncio muda */}
                  {showContextCard && (
                    <ItemContextCard
                      itemId={item.item_id}
                      itemTitle={item.item_title}
                      itemStatus={item.item_status}
                      listingProductsMap={listingProductsMap}
                      onOpenListing={openSelectedQuestionListing}
                    />
                  )}

                  <div className="space-y-2">
                    {/* Buyer question bubble */}
                    <div className="flex items-end gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-semibold shrink-0 select-none">
                        {initials.slice(0, 1)}
                      </div>
                      <div className="flex flex-col gap-0.5 max-w-[75%]">
                        <div className={cn(
                          "px-4 py-3 rounded-2xl rounded-tl-none text-sm leading-relaxed max-w-xs",
                          isActive && !item.answer_text
                            ? "bg-amber-50 text-gray-800 ring-1 ring-amber-300 shadow-sm"
                            : "bg-gray-100 text-gray-800"
                        )}>
                          {item.text}
                        </div>
                        <div className="flex items-center gap-2 px-1 mt-1.5">
                          <span className="text-xs text-gray-500 font-medium">{formatDate(item.date_created)}</span>
                          {isActive && !item.answer_text && (
                            <span className="text-xs text-amber-700 font-semibold">← respondendo</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Seller reply bubble */}
                    {item.answer_text && (
                      <div className="flex items-end justify-end gap-2">
                        <div className="flex flex-col items-end gap-1.5 max-w-xs">
                          <div className="px-4 py-3 bg-brand-600 text-white rounded-2xl rounded-tr-none text-sm leading-relaxed shadow-md">
                            {item.answer_text}
                          </div>
                          <div className="flex items-center gap-2 px-1 mt-1">
                            {item.answered_by === "template" && (
                              <span className="text-xs text-gray-500">Via template ·</span>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatDate(item.answer_date_created)}
                            </span>
                            <Check size={14} className="text-emerald-500" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Reply form */}
      <div className="border-t border-gray-200 px-5 py-4 space-y-3 shrink-0">
        {allAnswered ? (
          <div className="flex items-center gap-2.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 shadow-sm">
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="font-medium">Todas as perguntas desta conversa foram respondidas.</span>
          </div>
        ) : (
          <>
            {/* Smart suggestions */}
            {smartSuggestions.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 mb-2.5 flex items-center gap-2 font-semibold">
                  <Zap size={14} /> Sugestões rápidas
                </p>
                <div className="flex flex-wrap gap-2">
                  {smartSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="text-xs px-3.5 py-2 rounded-lg border border-brand-300 text-brand-700 bg-brand-50 hover:bg-brand-100 font-medium transition-colors duration-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Textarea with hashtag autocomplete */}
            <div className="relative" ref={hashAnchorRef}>
              <textarea
                ref={replyTextareaRef}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200 placeholder-gray-400"
                placeholder="Escreva sua resposta... (# para usar templates)"
                value={replyText}
                onChange={handleReplyChange}
                onKeyDown={handleReplyKeyDown}
              />
              {hashDropdownOpen && hashSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 z-50 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {hashSuggestions.map((t, idx) => (
                    <button
                      key={t._id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); applyHashTemplate(t); }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors duration-150",
                        idx === hashDropdownIndex
                          ? "bg-brand-50 text-brand-700"
                          : "hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      <span className="font-semibold shrink-0 font-mono">#{t.name}</span>
                      <span className="text-xs text-gray-500 line-clamp-1 flex-1">{t.content}</span>
                    </button>
                  ))}
                  <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 font-medium">
                    Enter para inserir · Esc para fechar
                  </p>
                </div>
              )}
            </div>

            {/* Action row: secondary buttons + send */}
            <div className="flex items-center gap-2">
              {/* Template button */}
              <button
                type="button"
                onClick={onOpenTemplates}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                title="Usar template"
              >
                <Hash size={13} /> Templates
              </button>

              {/* Products button */}
              <button
                type="button"
                onClick={onOpenProducts}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                title="Inserir link de anúncio"
              >
                <ShoppingBag size={13} /> Anúncios
              </button>

              {/* Send button */}
              <button
                type="button"
                onClick={onRequestSend}
                disabled={sendingReply || !replyText.trim()}
                className="ml-auto px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold flex items-center gap-2.5 disabled:opacity-50 hover:bg-brand-700 active:bg-brand-800 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {sendingReply ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {sendingReply ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
