export function getInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Escapa caracteres especiais de regex para uso seguro em RegExp */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Gera um trecho do texto ao redor da primeira ocorrência do termo,
 * para a prévia de resultados de busca (estilo WhatsApp).
 */
function makeSnippet(text, term, radius = 35) {
  const str = String(text || "");
  if (!str) return "";
  const idx = str.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return str;
  const start = Math.max(0, idx - radius);
  const end = Math.min(str.length, idx + term.length + radius);
  return `${start > 0 ? "…" : ""}${str.slice(start, end)}${end < str.length ? "…" : ""}`;
}

/**
 * Agrupa perguntas por comprador (from_id) em conversas, ordenadas por data.
 * Quando `searchTerm` é informado, calcula `matchSnippet` por conversa — o trecho
 * (pergunta ou resposta) que contém o termo buscado.
 */
export function buildConversations(questions, sortOrder = "desc", searchTerm = "") {
  const term = String(searchTerm || "").trim();
  const map = new Map();

  for (const q of questions) {
    if (!map.has(q.from_id)) {
      map.set(q.from_id, {
        from_id: q.from_id,
        from_nickname: q.from_nickname,
        questions: [],
        lastDate: q.date_created,
        unansweredCount: 0,
        lastQuestionText: q.text,
        item_title: q.item_title,
        matchSnippet: "",
      });
    }
    const conv = map.get(q.from_id);
    conv.questions.push(q);
    if (q.date_created > conv.lastDate) {
      conv.lastDate = q.date_created;
      conv.lastQuestionText = q.text;
      conv.item_title = q.item_title;
    }
    if (q.status === "UNANSWERED") conv.unansweredCount++;

    // Snippet do termo buscado (prioriza a pergunta; cai para a resposta)
    if (term && !conv.matchSnippet) {
      const lower = term.toLowerCase();
      if (String(q.text || "").toLowerCase().includes(lower)) {
        conv.matchSnippet = makeSnippet(q.text, term);
      } else if (String(q.answer_text || "").toLowerCase().includes(lower)) {
        conv.matchSnippet = `Resposta: ${makeSnippet(q.answer_text, term)}`;
      }
    }
  }

  return [...map.values()].sort((a, b) =>
    sortOrder === "desc"
      ? b.lastDate > a.lastDate ? 1 : -1
      : a.lastDate > b.lastDate ? 1 : -1
  );
}
