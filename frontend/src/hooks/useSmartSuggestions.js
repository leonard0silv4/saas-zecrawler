import { useMemo } from "react";

/**
 * Regras de sugestão rápida genéricas para qualquer loja no Mercado Livre.
 * Cada regra tem:
 *   - keywords: strings a detectar na pergunta (case-insensitive, busca parcial)
 *   - suggestions: respostas rápidas sugeridas (máx 2 por categoria)
 *
 * Edite este arquivo para ajustar sugestões sem tocar na lógica principal.
 * Ordem importa: categorias mais frequentes primeiro.
 */
const SMART_SUGGESTIONS_RULES = [
  {
    keywords: ["frete", "entrega", "envio", "prazo", "demora", "chegada", "despacho"],
    suggestions: [
      "O frete é calculado automaticamente pelo Mercado Livre conforme sua região 😊",
      "Enviamos para todo o Brasil! O prazo de entrega aparece no checkout.",
    ],
  },
  {
    keywords: ["preço", "valor", "custa", "custo", "quanto", "desconto", "preco"],
    suggestions: [
      "O preço exibido no anúncio já inclui todos os valores, sem taxas adicionais.",
      "Trabalhamos com o melhor preço! Qualquer dúvida, estamos à disposição 😊",
    ],
  },
  {
    keywords: ["disponível", "estoque", "disponivel", "disponibilidade", "ainda tem", "tem mais"],
    suggestions: [
      "Sim, temos disponível! Aproveite 😊",
      "Produto em estoque, pronto para envio.",
    ],
  },
  {
    keywords: ["garantia", "troca", "defeito", "danificado", "problema"],
    suggestions: [
      "Sim! O produto possui garantia conforme descrito no anúncio.",
      "Em caso de defeito, realizamos a troca. Estamos à disposição!",
    ],
  },
  {
    keywords: ["nota fiscal", "nota", " nf ", "imposto"],
    suggestions: [
      "Sim, emitimos nota fiscal em todas as compras.",
    ],
  },
  {
    keywords: ["parcelar", "parcelamento", "cartão", "cartao", "pix", "boleto", "pagamento"],
    suggestions: [
      "Aceitamos todos os métodos de pagamento disponíveis no Mercado Livre.",
    ],
  },
  {
    keywords: ["personaliz", "sob medida", "encomenda", "customiz"],
    suggestions: [
      "Claro! Me informe as especificações desejadas e verificamos a disponibilidade 😊",
    ],
  },
  {
    keywords: ["foto", "imagem", "original", "real"],
    suggestions: [
      "As fotos são do produto original que será enviado.",
    ],
  },
  {
    keywords: ["cor ", "cores ", "tamanho", "modelo", "versão", "variação", "opcao", "opção"],
    suggestions: [
      "As variações disponíveis estão listadas no anúncio. Qual você prefere?",
    ],
  },
];

function getSmartSuggestions(questionText) {
  if (!questionText) return [];
  const lower = ` ${questionText.toLowerCase()} `;
  const results = [];
  for (const rule of SMART_SUGGESTIONS_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      results.push(...rule.suggestions);
      if (results.length >= 3) break;
    }
  }
  return results.slice(0, 3);
}

/**
 * Retorna sugestões de resposta rápida baseadas no texto da pergunta do comprador.
 * Recalcula automaticamente quando a pergunta muda.
 *
 * @param {string} questionText - Texto da pergunta do comprador
 * @returns {string[]} Array com até 3 sugestões de resposta
 */
export function useSmartSuggestions(questionText) {
  return useMemo(() => getSmartSuggestions(questionText ?? ""), [questionText]);
}
