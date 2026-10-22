import { useState, useEffect, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCheck,
  CheckCircle2,
  CornerDownRight,
  Sparkles,
  ExternalLink,
  FlaskConical,
  Hash,
  Loader2,
  MessageSquare,
  Package,
  Send,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react";
import { getInitials } from "./utils";
import { Modal } from "../ui/Modal";
import { HoloRing, LiveDot } from "../fx";

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
  active: "bg-neon/10 text-neon ring-neon/30",
  paused: "bg-warn/10 text-warn ring-warn/30",
  closed: "bg-ink/5 text-fg-muted ring-ink/10",
};

const STATUS_DOT = {
  active: "bg-neon shadow-[0_0_6px_rgb(var(--neon))]",
  paused: "bg-warn",
  closed: "bg-fg-dim",
};

const STATUS_LABEL = {
  active: "Ativo",
  paused: "Pausado",
  closed: "Encerrado",
};

// Limite de caracteres de uma resposta no Mercado Livre.
const MAX_REPLY = 2000;

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function ItemContextCard({ itemId, itemTitle, itemStatus, listingProductsMap, onOpenListing }) {
  const product = listingProductsMap?.get(itemId);
  const title = product?.title || itemTitle || itemId;
  const price = product?.sale_price ?? product?.price ?? null;
  const status = product?.status || itemStatus || null;
  const thumbnail = product?.thumbnail || null;
  const permalink = product?.permalink || null;

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-line/20" />
        <span className="text-[11px] text-fg-dim select-none whitespace-nowrap">Sobre este anúncio</span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-line/20" />
      </div>

      <div className="glass flex items-center gap-3 rounded-2xl px-3 py-2.5 max-w-md w-full transition-colors hover:border-line/25">
        <div className="w-12 h-12 shrink-0 rounded-xl border border-line/10 bg-surface-2 overflow-hidden flex items-center justify-center">
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
            <Package size={18} className="text-fg-dim" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-fg leading-snug line-clamp-2">{title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {status && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ring-1 ring-inset",
                STATUS_BADGE[status] || STATUS_BADGE.closed
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[status] || STATUS_DOT.closed)} />
                {STATUS_LABEL[status] || status}
              </span>
            )}
            {price != null && (
              <span className="text-xs font-semibold text-fg num">{formatPrice(price)}</span>
            )}
            {product?.available_quantity != null && (
              <span className="text-[11px] text-fg-dim">
                <span className="num">{product.available_quantity}</span> em estoque
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => permalink ? window.open(permalink, "_blank", "noopener,noreferrer") : onOpenListing?.()}
          disabled={!permalink && !itemId}
          className="shrink-0 p-2 rounded-lg text-fg-dim hover:text-glow hover:bg-glow/10 transition-colors disabled:opacity-30"
          title="Abrir no Mercado Livre"
        >
          <ExternalLink size={14} />
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
  selectedAccount,
}) {
  const chatContainerRef = useRef(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = threadSortOrder === "asc" ? el.scrollHeight : 0;
  }, [buyerThread, selectedConversation?.from_id, threadSortOrder]);

  if (!selectedConversation) {
    return (
      <section className="glass rounded-2xl lg:col-span-3 flex items-center justify-center min-h-[360px] overflow-hidden">
        <div className="flex flex-col items-center text-center px-8">
          <HoloRing size={260} className="-mb-14" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-glow/30 bg-glow/10 text-glow shadow-[0_0_30px_-6px_rgb(var(--glow)/0.8)]">
            <MessageSquare size={24} />
          </div>
          <p className="mt-5 font-medium text-fg">Selecione uma conversa</p>
          <p className="mt-1 text-sm text-fg-muted max-w-xs">
            As perguntas pendentes aparecem primeiro com o tempo de espera em destaque.
          </p>
        </div>
      </section>
    );
  }

  const buyerName = selectedConversation.from_nickname || `Comprador #${selectedConversation.from_id}`;
  const initials = getInitials(buyerName);
  const allAnswered = activeQuestion?.status !== "UNANSWERED";
  const replyLength = replyText.length;
  const overLimit = replyLength > MAX_REPLY;

  const sortedThread = [...buyerThread].sort((a, b) =>
    threadSortOrder === "asc"
      ? new Date(a.date_created) - new Date(b.date_created)
      : new Date(b.date_created) - new Date(a.date_created)
  );

  function onComposerKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !hashDropdownOpen) {
      e.preventDefault();
      if (replyText.trim() && !sendingReply && !overLimit) onRequestSend();
      return;
    }
    handleReplyKeyDown(e);
  }

  return (
    <>
    <section className="glass rounded-2xl lg:col-span-3 flex flex-col overflow-hidden min-h-[480px] lg:flex-1 lg:min-h-0">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-line/10 flex items-center gap-3 shrink-0 bg-gradient-to-r from-brandSolid-500/[0.08] to-transparent">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brandSolid-400 to-brandSolid-700 text-white flex items-center justify-center text-xs font-semibold shrink-0 select-none ring-1 ring-glow/40">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fg truncate">{buyerName}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs">
            <span className="text-fg-dim">
              <span className="num">{buyerThread.length}</span> {buyerThread.length === 1 ? "interação" : "interações"}
            </span>
            {selectedConversation.unansweredCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/10 px-2 py-0.5 text-warn ring-1 ring-inset ring-warn/30">
                <LiveDot tone="warn" className="!h-1.5 !w-1.5" />
                <span className="num">{selectedConversation.unansweredCount}</span> pendente{selectedConversation.unansweredCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setThreadSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
            title={threadSortOrder === "asc" ? "Mais antigas primeiro" : "Mais novas primeiro"}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-fg-muted hover:text-fg hover:bg-ink/[0.05] transition-colors"
          >
            {threadSortOrder === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            <span className="hidden sm:inline">{threadSortOrder === "asc" ? "Antigas primeiro" : "Novas primeiro"}</span>
          </button>
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
            className="p-2 rounded-lg text-fg-dim hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-40"
            title="Excluir pergunta ativa do sistema"
            aria-label="Excluir pergunta ativa do sistema"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Chat bubbles */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5 min-h-0">
        {loadingBuyerThread ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn("flex", i % 2 ? "justify-end" : "")}>
                <div className="h-14 w-2/3 max-w-sm animate-pulse rounded-2xl bg-ink/[0.05]" />
              </div>
            ))}
          </div>
        ) : sortedThread.length === 0 ? (
          <p className="text-xs text-fg-dim text-center py-8">
            Sem histórico de mensagens para este comprador.
          </p>
        ) : (
          (() => {
            let prevItemId = null;
            return sortedThread.map((item) => {
              const showContextCard = item.item_id !== prevItemId;
              prevItemId = item.item_id;
              const isActive = item.question_id === activeQuestion?.question_id;
              const waitingThis = isActive && !item.answer_text;

              return (
                <div key={item.question_id} className="space-y-3">
                  {showContextCard && (
                    <ItemContextCard
                      itemId={item.item_id}
                      itemTitle={item.item_title}
                      itemStatus={item.item_status}
                      listingProductsMap={listingProductsMap}
                      onOpenListing={openSelectedQuestionListing}
                    />
                  )}

                  {/* Pergunta do comprador */}
                  <div className="flex items-end gap-2">
                    <div className="w-7 h-7 rounded-full bg-ink/[0.07] text-fg-muted flex items-center justify-center text-[10px] font-semibold shrink-0 select-none">
                      {initials.slice(0, 1)}
                    </div>
                    <div className="flex flex-col gap-1 max-w-[80%] sm:max-w-[70%]">
                      <div className={cn(
                        "px-4 py-3 rounded-2xl rounded-bl-md text-sm leading-relaxed whitespace-pre-wrap break-words",
                        waitingThis
                          ? "bg-warn/[0.08] text-fg ring-1 ring-warn/40 shadow-[0_0_24px_-10px_rgb(var(--warn)/0.8)]"
                          : "bg-ink/[0.06] text-fg/90 ring-1 ring-ink/[0.06]"
                      )}>
                        {item.text}
                      </div>
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[11px] text-fg-dim num">{formatDate(item.date_created)}</span>
                        {waitingThis && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warn">
                            <LiveDot tone="warn" className="!h-1.5 !w-1.5" /> Aguardando sua resposta
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resposta do vendedor */}
                  {item.answer_text && (
                    <div className="flex justify-end">
                      <div className="flex flex-col items-end gap-1 max-w-[80%] sm:max-w-[70%]">
                        <div className="px-4 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed text-white whitespace-pre-wrap break-words bg-gradient-to-br from-brandSolid-500 to-brandSolid-700 shadow-[0_8px_24px_-12px_rgb(30_123_255/0.9)] ring-1 ring-brandSolid-300/30">
                          {item.answer_text}
                        </div>
                        <div className="flex items-center gap-1.5 px-1 flex-wrap justify-end text-[11px]">
                          {selectedAccount?.nickname && (
                            <span className="inline-flex items-center gap-1 font-medium text-brandSolid-300">
                              <Store size={10} className="shrink-0" />
                              {selectedAccount.nickname}
                            </span>
                          )}
                          {item.answeredByUserId?.name && (
                            <span className="text-fg-muted">· {item.answeredByUserId.name}</span>
                          )}
                          {item.answered_by === "template" && (
                            <span className="text-fg-dim">· via template</span>
                          )}
                          <span className="text-fg-dim num">{formatDate(item.answer_date_created)}</span>
                          <CheckCheck size={14} className="text-neon" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-line/10 bg-surface/50 px-3 py-3 sm:px-5 sm:py-4 space-y-3 shrink-0">
        {allAnswered ? (
          <div className="flex items-center gap-2.5 text-sm text-neon bg-neon/[0.07] ring-1 ring-inset ring-neon/25 rounded-xl px-4 py-3">
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="font-medium">Tudo respondido nesta conversa.</span>
          </div>
        ) : (
          <>
            {/* Pergunta que está sendo respondida */}
            <div className="flex items-start gap-2 rounded-xl border-l-2 border-warn/70 bg-warn/[0.05] px-3 py-2">
              <CornerDownRight size={14} className="mt-0.5 shrink-0 text-warn" />
              <p className="text-xs text-fg-muted line-clamp-2">
                <span className="font-medium text-fg">Respondendo: </span>
                {activeQuestion?.text}
              </p>
            </div>

            {/* Sugestões rápidas inline */}
            {smartSuggestions.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-glow">
                  <Sparkles size={12} /> Sugestões
                </span>
                {smartSuggestions.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    title={s}
                    className="shrink-0 max-w-[260px] truncate rounded-full border border-glow/25 bg-glow/[0.06] px-3 py-1 text-xs text-fg/90 hover:border-glow/50 hover:bg-glow/[0.12] transition-colors"
                  >
                    {s}
                  </button>
                ))}
                {smartSuggestions.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setSuggestionsOpen(true)}
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs text-fg-muted hover:text-fg hover:bg-ink/[0.05]"
                  >
                    Ver todas ({smartSuggestions.length})
                  </button>
                )}
              </div>
            )}

            {/* Textarea com autocomplete de # */}
            <div className="relative" ref={hashAnchorRef}>
              <textarea
                ref={replyTextareaRef}
                className={cn("field min-h-[110px] resize-none !px-4 !py-3 leading-relaxed", overLimit && "!border-danger/70")}
                placeholder="Escreva sua resposta — digite # para usar um template"
                value={replyText}
                onChange={handleReplyChange}
                onKeyDown={onComposerKeyDown}
                aria-label="Resposta ao comprador"
              />
              <span className={cn(
                "pointer-events-none absolute bottom-2 right-3 text-[11px] num",
                overLimit ? "text-danger" : replyLength > MAX_REPLY * 0.9 ? "text-warn" : "text-fg-dim"
              )}>
                {replyLength}/{MAX_REPLY}
              </span>
              {hashDropdownOpen && hashSuggestions.length > 0 && (
                <div className="popover absolute bottom-full left-0 right-0 z-50 mb-2">
                  <p className="px-4 pt-2.5 pb-1.5 text-[11px] text-fg-dim">Templates</p>
                  {hashSuggestions.map((t, idx) => (
                    <button
                      key={t._id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); applyHashTemplate(t); }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors duration-150",
                        idx === hashDropdownIndex
                          ? "bg-brandSolid-500/15 text-fg"
                          : "hover:bg-ink/[0.04] text-fg-muted"
                      )}
                    >
                      <span className="font-medium shrink-0 text-glow">#{t.name}</span>
                      <span className="text-xs text-fg-dim line-clamp-1 flex-1">{t.content}</span>
                    </button>
                  ))}
                  <p className="px-4 py-2 text-[11px] text-fg-dim border-t border-line/10">
                    ↑↓ para navegar · Enter para inserir · Esc para fechar
                  </p>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenTemplates}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line/15 bg-surface-2/60 text-fg-muted text-xs font-medium hover:text-fg hover:border-line/30 transition-colors"
                title="Usar template"
              >
                <Hash size={13} className="text-glow" /> Templates
              </button>
              <button
                type="button"
                onClick={onOpenProducts}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line/15 bg-surface-2/60 text-fg-muted text-xs font-medium hover:text-fg hover:border-line/30 transition-colors"
                title="Inserir link de anúncio"
              >
                <ShoppingBag size={13} className="text-warn" /> Anúncios
              </button>
              {smartSuggestions.length > 0 && smartSuggestions.length <= 3 && (
                <button
                  type="button"
                  onClick={() => setSuggestionsOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line/15 bg-surface-2/60 text-fg-muted text-xs font-medium hover:text-fg hover:border-line/30 transition-colors"
                  title="Ver sugestões de resposta"
                >
                  <FlaskConical size={13} className="text-violet-300" /> Sugestões
                </button>
              )}

              <span className="ml-auto hidden md:inline text-[11px] text-fg-dim">
                <kbd className="rounded border border-line/20 bg-ink/[0.04] px-1.5 py-0.5 font-sans">{isMac ? "⌘" : "Ctrl"}</kbd>
                {" + "}
                <kbd className="rounded border border-line/20 bg-ink/[0.04] px-1.5 py-0.5 font-sans">Enter</kbd> para enviar
              </span>
              <button
                type="button"
                onClick={onRequestSend}
                disabled={sendingReply || !replyText.trim() || overLimit}
                className="ml-auto md:ml-0 px-5 py-2 rounded-lg bg-brandSolid-500 hover:bg-brandSolid-400 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40 disabled:shadow-none transition-colors shadow-glow-brand"
              >
                {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                {sendingReply ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>

    <Modal
      isOpen={suggestionsOpen}
      onClose={() => setSuggestionsOpen(false)}
      title="Sugestões rápidas"
      size="md"
    >
      <div className="flex items-start gap-3 mb-4 p-3 rounded-xl bg-violet-500/10 ring-1 ring-inset ring-violet-400/25">
        <FlaskConical size={16} className="text-violet-300 shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-semibold text-violet-300">Experimental</span>
          <p className="text-xs text-fg-muted mt-0.5">
            Sugestões geradas com base nas respostas anteriores da sua loja. Os resultados podem variar.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {smartSuggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              applySuggestion(s);
              setSuggestionsOpen(false);
            }}
            className="text-left text-sm px-4 py-3 rounded-xl border border-line/15 text-fg/90 bg-ink/[0.03] hover:bg-brandSolid-500/10 hover:border-brandSolid-400/40 hover:text-fg transition-colors leading-relaxed"
          >
            {s}
          </button>
        ))}
      </div>
    </Modal>
    </>
  );
}
