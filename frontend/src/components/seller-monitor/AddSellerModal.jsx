import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import api from "../../services/api";
import { notifyError } from "../../utils/notify.js";
import { Modal } from "../ui/Modal";

/**
 * Cadastro de seller: escolhendo um concorrente encontrado na varredura de catálogos
 * ou informando a página do vendedor (/pagina/NICK, /perfil/NICK, _CustId_).
 */
export function AddSellerModal({ isOpen, onClose, onAdded }) {
  const [tab, setTab] = useState("competitors");
  const [filter, setFilter] = useState("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(null);

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ["seller-monitor-competitors"],
    queryFn: () => api.get("/seller-monitor/competitors").then((r) => r.data),
    enabled: isOpen,
  });

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? competitors.filter((c) => c.nickname?.toLowerCase().includes(f)) : competitors;
  }, [competitors, filter]);

  async function add(body, key) {
    setSaving(key);
    try {
      await api.post("/seller-monitor", body);
      onAdded();
      onClose();
      setUrl("");
      setName("");
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao cadastrar");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cadastrar seller" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          {[["competitors", "Concorrentes encontrados"], ["url", "Por link do vendedor"]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === id ? "bg-brand-100 text-brand-800" : "text-gray-600 hover:bg-gray-50"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "competitors" ? (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar por nickname..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none" />
            </div>
            {isLoading ? (
              <p className="text-center text-sm text-gray-400 py-8">Carregando…</p>
            ) : competitors.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">
                Nenhum concorrente ainda. Rode a varredura de catálogos (botão "Varrer agora").
              </p>
            ) : (
              <ul className="max-h-96 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
                {filtered.map((c) => (
                  <li key={c.sellerId} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{c.nickname || `Vendedor ${c.sellerId}`}</p>
                      <p className="text-xs text-gray-500">
                        {c.catalogCount} {c.catalogCount === 1 ? "catálogo" : "catálogos"} em comum
                        {c.cheapest > 0 ? ` · menor preço em ${c.cheapest}` : ""}
                      </p>
                    </div>
                    {c.monitored ? (
                      <span className="text-xs text-gray-400">Monitorado</span>
                    ) : (
                      <button type="button" disabled={saving !== null}
                        onClick={() => add({ mlSellerId: c.sellerId, nickname: c.nickname }, c.sellerId)}
                        className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-50">
                        {saving === c.sellerId ? "Salvando…" : "Monitorar"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (url.trim()) add({ url: url.trim(), name: name.trim() }, "url"); }}
            className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Página do vendedor *</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.mercadolivre.com.br/pagina/NICKNAME"
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <p className="text-xs text-gray-500 mt-1">
                Aceita /pagina/NICK, /perfil/NICK ou listagem com _CustId_. Só aparecem produtos do vendedor que estejam
                nos catálogos varridos — se ele não for encontrado, o seller fica marcado como "Sem dados".
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Nome (opcional)</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button type="submit" disabled={saving !== null}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50">
                {saving === "url" ? "Salvando…" : "Cadastrar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
