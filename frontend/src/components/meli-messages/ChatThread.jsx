import { useEffect, useRef } from "react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Hash,
  Loader2,
  MessageSquare,
  Package,
  Search,
  Send,
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

function formatPrice(price) {
  if (price == null) return null;
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  closed: "bg-gray-100 text-gray-600",
};

const STATUS_LABEL = {
  active: "Ativo",
  paused: "Pausado",
  closed: "Encerrado",
};

function ListingCard({ listingProduct, fallbackQuestion, onOpenListing }) {
  const title = listingProduct?.title || fallbackQuestion?.item_title || null;
  const price = listingProduct?.price ?? null;
  const stock = listingProduct?.available_quantity ?? null;
  const status = listingProduct?.status || fallbackQuestion?.item_status || null;
  const thumbnail = listingProduct?.thumbnail || null;

  if (!title && !fallbackQuestion?.item_id) return null;

  return (
    <div className="flex items-center gap-3 p-3.5 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="w-14 h-14 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
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
          <Package size={22} className="text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 line-clamp-1">
          {title || fallbackQuestion?.item_id || "Anúncio"}
        </p>
        <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 mt-1">
          {price != null && (
            <span className="text-sm font-bold text-gray-800">{formatPrice(price)}</span>
          )}
          {status && (
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", STATUS_BADGE[status] || "bg-gray-100 text-gray-600")}>
              {STATUS_LABEL[status] || status}
            </span>
          )}
          {stock != null && stock >= 0 && (
            <span className="text-xs text-gray-500">{stock} em estoque</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenListing}
        disabled={!fallbackQuestion?.item_id}
        className="shrink-0 p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all duration-200 disabled:opacity-30"
        title="Abrir anúncio no Mercado Livre"
      >
        <ExternalLink size={15} />
      </button>
    </div>
  );
}

export function ChatThread({
  selectedConversation,
  activeQuestion,
  listingProduct,
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
  sendManualReply,
  openSelectedQuestionListing,
  setDeleteQuestionModal,
  onInsertGreeting,
  onOpenTemplateModal,
  onOpenProductModal,
}) {
  const historyRef = useRef(null);

  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [buyerThread, selectedConversation?.from_id]);

  if (!selectedConversation) {
    return (
      <div className="flex flex-1 h-full overflow-hidden items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <MessageSquare size={32} className="text-gray-300" />
          <p className="text-sm text-gray-500">Selecione uma conversa para começar.</p>
        </div>
      </div>
    );
  }

  const buyerName = selectedConversation.from_nickname || `Comprador #${selectedConversation.from_id}`;
  const initials = getInitials(buyerName);
  const allAnswered = activeQuestion?.status !== "UNANSWERED";

  function openDeleteModal() {
    if (!activeQuestion) return;
    setDeleteQuestionModal({
      question_id: activeQuestion.question_id,
      text: activeQuestion.text,
      status: activeQuestion.status,
    });
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden min-w-0">
      {/* ── Centro ── */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 bg-[#f8f9fa] min-w-0">
        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          <ListingCard
            listingProduct={listingProduct}
            fallbackQuestion={activeQuestion}
            onOpenListing={openSelectedQuestionListing}
          />

          {allAnswered ? (
            <div className="flex items-center gap-2.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
              <CheckCircle2 size={18} className="shrink-0" />
              <span className="font-medium">Todas as perguntas desta conversa foram respondidas.</span>
            </div>
          ) : activeQuestion ? (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0 select-none">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 font-medium mb-1.5">{buyerName}</p>
                  <p className="text-base text-gray-800 leading-relaxed">{activeQuestion.text}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(activeQuestion.date_created)}</p>
                </div>
              </div>
            </div>
          ) : null}

          {!allAnswered && smartSuggestions.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-2 flex items-center gap-1.5 font-semibold">
                <Zap size={13} /> Sugestões rápidas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {smartSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-brand-300 text-brand-700 bg-brand-50 hover:bg-brand-100 font-medium transition-colors duration-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Formulário de resposta */}
        {!allAnswered && (
          <div className="shrink-0 p-5 pt-4 space-y-3 border-t border-gray-200 bg-[#f8f9fa]">
            <div className="relative" ref={hashAnchorRef}>
              <textarea
                ref={replyTextareaRef}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200 placeholder-gray-400 bg-white"
                placeholder="Escreva sua resposta... (# para usar templates)"
                value={replyText}
                onChange={handleReplyChange}
                onKeyDown={handleReplyKeyDown}
              />
              {hashDropdownOpen && hashSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 z-50 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {hashSuggestions.map((t, idx) => (
                    <button
                      key={t._id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); applyHashTemplate(t); }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors duration-150",
                        idx === hashDropdownIndex ? "bg-brand-50 text-brand-700" : "hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      <span className="font-semibold shrink-0">#{t.name}</span>
                      <span className="text-xs text-gray-500 line-clamp-1 flex-1">{t.content}</span>
                    </button>
                  ))}
                  <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 font-medium">
                    Enter para inserir · Esc para fechar
                  </p>
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenTemplateModal}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:text-brand-700 hover:bg-brand-50 border border-gray-200 hover:border-brand-200 transition-all duration-150"
                title="Selecionar template"
              >
                <Hash size={12} /> Templates
              </button>
              <button
                type="button"
                onClick={onOpenProductModal}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:text-brand-700 hover:bg-brand-50 border border-gray-200 hover:border-brand-200 transition-all duration-150"
                title="Inserir link de anúncio"
              >
                <Search size={12} /> Anúncios
              </button>
              <button
                type="button"
                onClick={onInsertGreeting}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:text-brand-700 hover:bg-brand-50 border border-gray-200 hover:border-brand-200 transition-all duration-150"
                title="Inserir saudação automática"
              >
                Saudação
              </button>
              <span className="ml-auto text-xs text-gray-400 tabular-nums">{replyText.length}</span>
            </div>

            {/* Footer: Excluir + Enviar */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={openDeleteModal}
                disabled={!activeQuestion}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-all duration-200 disabled:opacity-40"
              >
                <Trash2 size={13} /> Excluir
              </button>
              <button
                type="button"
                onClick={sendManualReply}
                disabled={sendingReply || !replyText.trim()}
                className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-brand-700 active:bg-brand-800 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {sendingReply ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sendingReply ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        )}

        {/* Footer para estado "todas respondidas" */}
        {allAnswered && (
          <div className="shrink-0 p-5 pt-3 border-t border-gray-200 flex justify-start">
            <button
              type="button"
              onClick={openDeleteModal}
              disabled={!activeQuestion}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-all duration-200 disabled:opacity-40"
            >
              <Trash2 size={13} /> Excluir pergunta
            </button>
          </div>
        )}
      </div>

      {/* ── Painel direita: Histórico ── */}
      <div className="w-64 shrink-0 flex flex-col overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-gray-200 shrink-0">
          <p className="text-sm font-bold text-gray-900 truncate">Histórico de {buyerName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {buyerThread.length} {buyerThread.length === 1 ? "interação" : "interações"}
            {selectedConversation.unansweredCount > 0 && (
              <span className="ml-1.5 text-amber-700 font-medium">
                · {selectedConversation.unansweredCount} pendente{selectedConversation.unansweredCount > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <div ref={historyRef} className="flex-1 overflow-y-auto p-4 bg-slate-50/40">
          {loadingBuyerThread ? (
            <div className="flex justify-center py-10">
              <Loader2 size={18} className="animate-spin text-gray-300" />
            </div>
          ) : buyerThread.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">Nenhum histórico encontrado.</p>
          ) : (
            <div className="space-y-0">
              {buyerThread.map((item, index) => {
                const isActive = item.question_id === activeQuestion?.question_id;
                const showTitle = index === 0 || buyerThread[index - 1]?.item_id !== item.item_id;
                const isLast = index === buyerThread.length - 1;
                return (
                  <div key={item.question_id} className="relative pl-5 pb-5">
                    {/* Linha da timeline */}
                    {!isLast && (
                      <div className="absolute left-[8px] top-3.5 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    {/* Ponto */}
                    <div
                      className={cn(
                        "absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-1",
                        isActive && !item.answer_text
                          ? "bg-amber-400 ring-amber-300"
                          : item.answer_text
                          ? "bg-emerald-400 ring-emerald-200"
                          : "bg-gray-300 ring-gray-200"
                      )}
                    />

                    {/* Badge do produto */}
                    {showTitle && item.item_title && (
                      <p className="text-[10px] text-brand-700 font-semibold bg-brand-50 border border-brand-100 rounded px-1.5 py-0.5 mb-1.5 line-clamp-1">
                        {item.item_title}
                      </p>
                    )}

                    {/* Pergunta */}
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm leading-relaxed break-words",
                        isActive && !item.answer_text
                          ? "bg-amber-50 ring-1 ring-amber-200 text-gray-800"
                          : "bg-white border border-gray-200 text-gray-800"
                      )}
                    >
                      {item.text}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 mb-1.5">
                      {formatRelativeTime(item.date_created)}
                    </p>

                    {/* Resposta */}
                    {item.answer_text && (
                      <>
                        <div className="rounded-lg px-3 py-2 text-sm leading-relaxed break-words bg-brand-50 border border-brand-100 text-gray-800 ml-2">
                          {item.answer_text}
                        </div>
                        <div className="flex items-center gap-1 mt-1 ml-2">
                          {item.answered_by === "template" && (
                            <span className="text-[10px] text-gray-400">Template ·</span>
                          )}
                          <Check size={10} className="text-emerald-500" />
                          <p className="text-xs text-gray-400">
                            {formatRelativeTime(item.answer_date_created)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
