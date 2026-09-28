import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Info, Layers, Loader2, RefreshCw, Tag, X } from "lucide-react";
import api from "../../services/api";
import { notifyError, notifyWarning } from "../../utils/notify.js";
import { Modal } from "../ui/Modal";

export const SCAN_QK = ["seller-monitor-scan"];

function fmtAgo(iso) {
  if (!iso) return "nunca";
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60) return "agora";
  if (sec < 3600) return `há ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `há ${Math.floor(sec / 3600)} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Painel da varredura de catálogos: de onde vêm os dados do Monitor de Sellers
 * (API oficial do ML só permite ver vendedores dentro de produtos de catálogo).
 */
export function CatalogScanPanel({ onScanFinished }) {
  const queryClient = useQueryClient();
  const [catOpen, setCatOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const { data: scan } = useQuery({
    queryKey: SCAN_QK,
    queryFn: () => api.get("/seller-monitor/scan").then((r) => r.data),
    refetchInterval: (q) => (q.state.data?.running ? 5000 : 60000),
  });

  // Quando a varredura termina, recarrega sellers/produtos
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && scan && !scan.running) onScanFinished?.();
    wasRunning.current = !!scan?.running;
  }, [scan?.running]);

  async function runScan() {
    setStarting(true);
    try {
      await api.post("/seller-monitor/scan");
      queryClient.invalidateQueries({ queryKey: SCAN_QK });
    } catch (err) {
      const status = err.response?.status;
      if (status === 409 || status === 429) notifyWarning(err.response.data.error);
      else notifyError(err.response?.data?.error || "Erro ao iniciar varredura");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Layers size={18} className="text-brand-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {scan?.running ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> Varrendo catálogos… (pode levar alguns minutos)
              </span>
            ) : (
              <>
                {scan?.catalogCount ?? 0} catálogos · {scan?.sellerCount ?? 0} vendedores · última varredura {fmtAgo(scan?.lastRunAt)}
              </>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-start gap-1">
            <Info size={12} className="shrink-0 mt-0.5" />
            Pela API oficial do Mercado Livre só é possível ver vendedores dentro de produtos de catálogo. Varremos os
            catálogos dos seus anúncios, dos seus Links e dos mais vendidos das categorias escolhidas (até {scan?.maxCatalogs ?? 300}).
          </p>
          {scan?.lastError === "NO_ACCOUNT" && (
            <p className="text-xs text-orange-700 mt-1">Conecte uma conta do Mercado Livre para varrer os catálogos.</p>
          )}
          {scan?.categories?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {scan.categories.map((c) => (
                <span key={c.id} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c.name || c.id}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button type="button" onClick={() => setCatOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <Tag size={14} /> Categorias
        </button>
        <button type="button" onClick={runScan} disabled={starting || scan?.running}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
          <RefreshCw size={14} className={scan?.running ? "animate-spin" : ""} /> Varrer agora
        </button>
      </div>

      <CategoriesModal
        isOpen={catOpen}
        onClose={() => setCatOpen(false)}
        initial={scan?.categories || []}
        max={scan?.maxCategories ?? 5}
        onSaved={() => queryClient.invalidateQueries({ queryKey: SCAN_QK })}
      />
    </div>
  );
}

function CategoriesModal({ isOpen, onClose, initial, max, onSaved }) {
  const [selected, setSelected] = useState(initial);
  const [path, setPath] = useState([]); // pilha de categorias abertas [{id, name}]
  const [saving, setSaving] = useState(false);
  const parent = path[path.length - 1];

  useEffect(() => {
    if (!isOpen) return;
    setSelected(initial);
    setPath([]);
  }, [isOpen]);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["ml-categories", parent?.id || "root"],
    queryFn: () => api.get("/seller-monitor/categories", { params: parent ? { parent: parent.id } : {} }).then((r) => r.data),
    enabled: isOpen,
    staleTime: 24 * 60 * 60 * 1000,
  });

  function toggle(c) {
    setSelected((prev) => {
      if (prev.some((p) => p.id === c.id)) return prev.filter((p) => p.id !== c.id);
      if (prev.length >= max) {
        notifyWarning(`Escolha no máximo ${max} categorias`);
        return prev;
      }
      return [...prev, { id: c.id, name: c.name }];
    });
  }

  async function save() {
    setSaving(true);
    try {
      await api.put("/seller-monitor/scan/categories", { categories: selected });
      onSaved();
      onClose();
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao salvar categorias");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Categorias (mais vendidos)" size="md">
      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          Os produtos de catálogo mais vendidos destas categorias entram na varredura. Categorias mais específicas trazem
          concorrentes mais relevantes. Máximo {max}.
        </p>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full">
                {c.name || c.id}
                <button type="button" onClick={() => toggle(c)}><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          {path.length > 0 && (
            <button type="button" onClick={() => setPath((p) => p.slice(0, -1))}
              className="inline-flex items-center gap-0.5 text-brand-600 hover:underline">
              <ChevronLeft size={12} /> Voltar
            </button>
          )}
          <span className="truncate">{path.length ? path.map((p) => p.name).join(" › ") : "Todas as categorias"}</span>
        </div>
        <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
          {isLoading ? (
            <li className="p-4 text-center text-sm text-gray-400">Carregando…</li>
          ) : list.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <input type="checkbox" checked={selected.some((s) => s.id === c.id)} onChange={() => toggle(c)}
                className="accent-brand-600" />
              <span className="flex-1 truncate">{c.name}</span>
              <button type="button" onClick={() => setPath((p) => [...p, { id: c.id, name: c.name }])}
                className="p-1 text-gray-400 hover:text-gray-700" title="Subcategorias">
                <ChevronRight size={14} />
              </button>
            </li>
          ))}
          {!isLoading && list.length === 0 && (
            <li className="p-4 text-center text-sm text-gray-400">Sem subcategorias.</li>
          )}
        </ul>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button type="button" onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
