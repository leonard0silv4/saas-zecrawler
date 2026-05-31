import { useEffect, useRef } from "react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
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
    <div className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      <div className="w-11 h-11 shrink-0 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
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
          <Package size={18} className="text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-1">
          {title || fallbackQuestion?.item_id || "Anúncio"}
        </p>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
          {price != null && (
            <span className="text-sm font-semibold text-gray-800">{formatPrice(price)}</span>
          )}
          {status && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
              STATUS_BADGE[status] || "bg-gray-100 text-gray-600"
            )}>
              {STATUS_LABEL[status] || status}
            </span>
          )}
          {stock != null && stock >= 0 && (
            <span className="text-[10px] text-gray-500">{stock} em estoque</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenListing}
        disabled={!fallbackQuestion?.item_id}
        className="shrink-0 p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-colors disabled:opacity-30"
        title="Abrir anúncio no Mercado Livre"
      >
        <ExternalLink size={14} />
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
  filteredProducts,
  productSearch,
  setProductSearch,
  loadingProducts,
  sendingReply,
  handleReplyChange,
  handleReplyKeyDown,
  applySuggestion,
  applyHashTemplate,
  insertProductLink,
  sendManualReply,
  openSelectedQuestionListing,
  setDeleteQuestionModal,
}) {
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [buyerThread, selectedConversation?.from_id]);

  if (!selectedConversation) {
    return (
      <section className="bg-white rounded-xl border border-gray-100 lg:col-span-3 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2 text-center px-6">
          <MessageSquare size={32} className="text-gray-200" />
          <p className="text-sm text-gray-400">Selecione uma conversa para começar.</p>
        </div>
      </section>
    );
  }

  const buyerName = selectedConversation.from_nickname || `Comprador #${selectedConversation.from_id}`;
  const initials = getInitials(buyerName);
  const allAnswered = activeQuestion?.status !== "UNANSWERED";
  const fallbackQuestion = activeQuestion;

  return (
    <section className="bg-white rounded-xl border border-gray-100 lg:col-span-3 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0 select-none">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{buyerName}</p>
          <p className="text-[10px] text-gray-400">
            {buyerThread.length} {buyerThread.length === 1 ? "interação" : "interações"}
            {selectedConversation.unansweredCount > 0 && (
              <span className="ml-1.5 text-amber-600">
                · {selectedConversation.unansweredCount} pendente{selectedConversation.unansweredCount > 1 ? "s" : ""}
              </span>
            )}
          </p>
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
          className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-30"
          title="Excluir pergunta ativa do sistema"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Listing card */}
      <div className="px-4 pt-3 shrink-0">
        <ListingCard
          listingProduct={listingProduct}
          fallbackQuestion={fallbackQuestion}
          onOpenListing={openSelectedQuestionListing}
        />
      </div>

      {/* Chat bubbles */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto max-h-[380px] px-4 py-4 space-y-4">
        {loadingBuyerThread ? (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-gray-300" />
          </div>
        ) : buyerThread.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Sem histórico de mensagens para este comprador.
          </p>
        ) : (
          buyerThread.map((item) => {
            const isActive = item.question_id === activeQuestion?.question_id;
            return (
              <div key={item.question_id} className="space-y-2">
                {/* Buyer question bubble */}
                <div className="flex items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-semibold shrink-0 select-none">
                    {initials.slice(0, 1)}
                  </div>
                  <div className="flex flex-col gap-0.5 max-w-[75%]">
                    <div className={cn(
                      "px-3 py-2 rounded-2xl rounded-tl-none text-sm leading-relaxed",
                      isActive && !item.answer_text
                        ? "bg-amber-50 text-gray-800 ring-1 ring-amber-300"
                        : "bg-gray-100 text-gray-800"
                    )}>
                      {item.text}
                    </div>
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] text-gray-400">{formatDate(item.date_created)}</span>
                      {isActive && !item.answer_text && (
                        <span className="text-[10px] text-amber-600 font-medium">← respondendo</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seller reply bubble */}
                {item.answer_text && (
                  <div className="flex items-end justify-end gap-2">
                    <div className="flex flex-col items-end gap-0.5 max-w-[75%]">
                      <div className="px-3 py-2 bg-brand-600 text-white rounded-2xl rounded-tr-none text-sm leading-relaxed">
                        {item.answer_text}
                      </div>
                      <div className="flex items-center gap-1.5 px-1">
                        {item.answered_by === "template" && (
                          <span className="text-[10px] text-gray-400">Via template ·</span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {formatDate(item.answer_date_created)}
                        </span>
                        <Check size={10} className="text-emerald-500" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reply form */}
      <div className="border-t border-gray-100 px-4 py-3 space-y-3 shrink-0">
        {allAnswered ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <CheckCircle2 size={15} className="shrink-0" />
            Todas as perguntas desta conversa foram respondidas.
          </div>
        ) : (
          <>
            {/* Smart suggestions */}
            {smartSuggestions.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5 flex items-center gap-1">
                  <Zap size={10} /> Sugestões rápidas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {smartSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Textarea with hashtag autocomplete */}
            <div>
              <div className="relative" ref={hashAnchorRef}>
                <textarea
                  ref={replyTextareaRef}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-brand-300 focus:border-brand-300 transition"
                  placeholder="Escreva sua resposta... (# para usar templates)"
                  value={replyText}
                  onChange={handleReplyChange}
                  onKeyDown={handleReplyKeyDown}
                />
                {hashDropdownOpen && hashSuggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 z-50 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {hashSuggestions.map((t, idx) => (
                      <button
                        key={t._id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); applyHashTemplate(t); }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                          idx === hashDropdownIndex
                            ? "bg-brand-50 text-brand-700"
                            : "hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        <span className="font-medium shrink-0">#{t.name}</span>
                        <span className="text-xs text-gray-400 line-clamp-1 flex-1">{t.content}</span>
                      </button>
                    ))}
                    <p className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">
                      Enter para inserir · Esc para fechar
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Send button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={sendManualReply}
                disabled={sendingReply || !replyText.trim()}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-brand-700 transition-colors"
              >
                {sendingReply ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {sendingReply ? "Enviando..." : "Enviar resposta"}
              </button>
            </div>

            {/* Product search — secondary, below send */}
            <div className="border-t border-gray-100 pt-3">
              <label className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">
                <Search size={10} /> Inserir link de anúncio na resposta
              </label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-300 focus:border-brand-300 transition"
                placeholder="Buscar produto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {loadingProducts && (
                <p className="text-[10px] text-gray-400 mt-1">Buscando...</p>
              )}
              {!loadingProducts && productSearch.trim() && filteredProducts.length === 0 && (
                <p className="text-[10px] text-amber-700 mt-1">Nenhum anúncio ativo encontrado.</p>
              )}
              {filteredProducts.length > 0 && (
                <div className="mt-1.5 border border-gray-100 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-50">
                  {filteredProducts.map((p) => (
                    <button
                      key={p._id || p.id}
                      type="button"
                      onClick={() => insertProductLink(p.permalink || "")}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex gap-2.5 items-center transition-colors"
                    >
                      <div className="w-9 h-9 shrink-0 rounded-md border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
                        {p.thumbnail ? (
                          <img
                            src={p.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <Package size={14} className="text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900 line-clamp-1">
                          {p.title || p.SKU || "Produto"}
                        </p>
                        <p className="text-[10px] text-brand-600 truncate">
                          {p.permalink || "Sem permalink"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
