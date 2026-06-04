import { useState, useEffect } from "react";
import api from "../services/api";

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

export function useSmartSuggestions(questionText, selectedUserId) {
  const [apiSuggestions, setApiSuggestions] = useState([]);

  useEffect(() => {
    if (!questionText) {
      setApiSuggestions([]);
      return;
    }
    let cancelled = false;
    api
      .get("/meli/messages/suggestions", {
        params: { q: questionText, user_id: selectedUserId || "" },
      })
      .then(({ data }) => {
        if (!cancelled && Array.isArray(data?.suggestions)) {
          setApiSuggestions(data.suggestions);
        }
      })
      .catch(() => {
        if (!cancelled) setApiSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [questionText, selectedUserId]);

  if (apiSuggestions.length > 0) return apiSuggestions.map((s) => s.text);
  return getSmartSuggestions(questionText ?? "");
}
