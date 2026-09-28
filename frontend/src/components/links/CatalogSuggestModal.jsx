import { useEffect, useState } from "react";
import { Search, Info } from "lucide-react";
import { Modal } from "../ui/Modal";
import api from "../../services/api";
import { notifyError } from "../../utils/notify.js";

/**
 * Sugere produtos de catálogo do ML para substituir um anúncio que a API não libera
 * (links /up/MLBU… fora de catálogo). A troca só acontece com confirmação do usuário.
 *
 * Passe `linkId` (link já cadastrado) ou `url` (link recusado no cadastro).
 * `onSelect(suggestion)` deve efetivar a escolha; o modal fecha quando ela resolve.
 */
export function CatalogSuggestModal({ isOpen, onClose, linkId, url, onSelect }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState(null);

  async function load(params) {
    setLoading(true);
    try {
      const { data } = await api.get("/links/catalog-suggestions", { params });
      setQuery(data.query || "");
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setSuggestions([]);
      notifyError(err.response?.data?.error || "Erro ao buscar produtos de catálogo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    setSuggestions([]);
    setQuery("");
    load(linkId ? { linkId } : { url });
  }, [isOpen, linkId, url]);

  async function handleSelect(s) {
    setSelectingId(s.id);
    try {
      await onSelect(s);
      onClose();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao usar produto de catálogo");
    } finally {
      setSelectingId(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Escolher produto de catálogo" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs text-orange-800">
          <Info size={14} className="shrink-0 mt-0.5 text-orange-500" />
          <p>
            Este anúncio está <strong>fora de catálogo</strong> e o Mercado Livre não libera os dados dele pela API.
            Escolha um produto de catálogo equivalente para acompanhar — o preço passará a ser o da oferta vencedora
            (ou a menor oferta) do catálogo, <strong>não</strong> o deste anúncio específico. Confira tamanho e modelo.
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); if (query.trim()) load({ q: query.trim() }); }}
          className="relative"
        >
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no catálogo do Mercado Livre..."
            className="w-full pl-9 pr-24 py-2 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
          />
          <button type="submit" disabled={loading}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
            Buscar
          </button>
        </form>

        {loading ? (
          <p className="text-center text-sm text-gray-400 py-8">Buscando no catálogo...</p>
        ) : suggestions.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Nenhum produto de catálogo encontrado. Tente outro termo.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {suggestions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                {s.image ? (
                  <img src={s.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <a href={s.permalink} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-brand-600 hover:underline line-clamp-2">
                    {s.name}
                  </a>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.price > 0 ? `R$ ${s.price.toFixed(2)}` : "Sem oferta ativa"}
                    {s.seller ? ` · ${s.seller}` : ""}
                    <span className="font-mono text-gray-400"> · {s.id}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleSelect(s)}
                  disabled={selectingId !== null}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-50">
                  {selectingId === s.id ? "Salvando..." : "Usar este"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
