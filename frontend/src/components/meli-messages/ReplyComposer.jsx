import { Check, ExternalLink, MessageCircle, Search, Send, Trash2, Zap } from "lucide-react";

function cn(...c) { return c.filter(Boolean).join(" "); }

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

export function ReplyComposer({
  selectedQuestion,
  buyerThread,
  loadingBuyerThread,
  replyText,
  hashAnchorRef,
  replyTextareaRef,
  hashDropdownOpen,
  hashSuggestions,
  hashDropdownIndex,
  smartSuggestions,
  products,
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
  return (
    <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 space-y-4 lg:col-span-3">
      <h2 className="font-semibold text-gray-900">Responder</h2>
      {!selectedQuestion ? (
        <p className="text-sm text-gray-500">Selecione uma pergunta para responder.</p>
      ) : (
        <>
          {loadingBuyerThread && (
            <p className="text-xs text-gray-400">Carregando histórico do comprador...</p>
          )}
          {!loadingBuyerThread && buyerThread.length >= 2 && (
            <div className="rounded-lg border-2 border-violet-200 bg-violet-50/40 text-sm overflow-hidden">
              <p className="text-xs font-semibold text-violet-700 px-3 pt-2.5 pb-1.5 flex items-center gap-1.5">
                <MessageCircle size={12} />
                Histórico com{" "}
                <span className="text-violet-900">
                  {selectedQuestion.from_nickname ||
                    buyerThread.find((i) => i.from_nickname)?.from_nickname ||
                    `comprador #${selectedQuestion.from_id}`}
                </span>
                <span className="ml-auto font-normal text-violet-500">
                  {buyerThread.length} {buyerThread.length === 1 ? "interação" : "interações"}
                </span>
              </p>
              <div className="divide-y divide-violet-100 max-h-52 overflow-y-auto">
                {buyerThread.map((item) => {
                  const isCurrent = item.question_id === selectedQuestion.question_id;
                  return (
                    <div
                      key={item.question_id}
                      className={cn("px-3 py-2 space-y-1", isCurrent ? "border-l-2 border-violet-400 bg-white" : "bg-violet-50/30")}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">{formatDate(item.date_created)}</span>
                        {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">atual</span>}
                      </div>
                      <p className={cn("text-gray-800 leading-snug", isCurrent ? "font-medium" : "")}>{item.text}</p>
                      {item.answer_text ? (
                        <p className="text-xs text-emerald-700 flex items-start gap-1">
                          <Check size={11} className="mt-0.5 shrink-0" />
                          <span>{item.answer_text}</span>
                        </p>
                      ) : !isCurrent ? (
                        <p className="text-xs text-gray-400 italic">Sem resposta ainda</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-sm bg-gray-50 rounded-lg border border-gray-100 p-3 space-y-1">
            <p className="text-gray-500">Pergunta selecionada #{selectedQuestion.question_id}</p>
            <p className="font-medium text-gray-900">{selectedQuestion.item_title || selectedQuestion.item_id || "Sem item"}</p>
            <p className="text-gray-700">{selectedQuestion.text}</p>
          </div>

          {selectedQuestion.status === "ANSWERED" && selectedQuestion.answer_text && (
            <div className="text-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-950 space-y-1">
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Sua resposta</p>
              <p className="text-gray-900 whitespace-pre-wrap">{selectedQuestion.answer_text}</p>
              {selectedQuestion.answer_date_created && (
                <p className="text-xs text-emerald-800/90 pt-1">Enviada em {formatDate(selectedQuestion.answer_date_created)}</p>
              )}
            </div>
          )}

          {selectedQuestion.status !== "ANSWERED" && smartSuggestions.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                <Zap size={11} /> Sugestões rápidas
              </p>
              <div className="flex flex-wrap gap-2">
                {smartSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="text-xs px-2.5 py-1 rounded-full border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedQuestion.status !== "ANSWERED" && (
            <div>
              <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                <Search size={12} /> Link do anúncio
              </label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Digite para buscar produto e inserir link na resposta..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {loadingProducts && <p className="text-xs text-gray-500 mt-1">Buscando produtos...</p>}
              {!loadingProducts && productSearch.trim() && filteredProducts.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">Nenhum anúncio ativo com estoque no momento.</p>
              )}
              {filteredProducts.length > 0 && (
                <div className="mt-2 border border-gray-100 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                  {filteredProducts.map((p) => (
                    <button
                      key={p._id || p.id}
                      type="button"
                      onClick={() => insertProductLink(p.permalink || "")}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex gap-3 items-center"
                    >
                      <div className="w-11 h-11 shrink-0 rounded-md border border-gray-100 bg-gray-100 overflow-hidden">
                        {p.thumbnail && (
                          <img src={p.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm text-gray-900 line-clamp-1">{p.title || p.SKU || "Produto sem título"}</p>
                        <p className="text-xs text-brand-700 truncate">{p.permalink || "Sem permalink"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedQuestion.status !== "ANSWERED" && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Sua resposta</label>
              <div className="relative" ref={hashAnchorRef}>
                <textarea
                  ref={replyTextareaRef}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[140px]"
                  placeholder="Escreva sua resposta... (# para templates)"
                  value={replyText}
                  onChange={handleReplyChange}
                  onKeyDown={handleReplyKeyDown}
                />
                {hashDropdownOpen && hashSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {hashSuggestions.map((t, idx) => (
                      <button
                        key={t._id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); applyHashTemplate(t); }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                          idx === hashDropdownIndex ? "bg-brand-50 text-brand-700" : "hover:bg-gray-50 text-gray-700"
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
          )}

          <div className="flex flex-wrap items-center gap-2">
            {selectedQuestion.status !== "ANSWERED" && (
              <button
                type="button"
                onClick={sendManualReply}
                disabled={sendingReply}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={14} />
                {sendingReply ? "Enviando..." : "Enviar resposta"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setDeleteQuestionModal({ question_id: selectedQuestion.question_id, text: selectedQuestion.text, status: selectedQuestion.status })}
              className="ml-auto p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              title="Excluir pergunta do sistema"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={openSelectedQuestionListing}
              disabled={!selectedQuestion.item_id}
              className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title="Abrir anúncio"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
