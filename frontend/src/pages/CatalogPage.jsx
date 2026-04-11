import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Plus, Search, Trash2, Upload } from "lucide-react";
import api from "../services/api";

const empty = {
  sku1: "",
  sku2: "",
  sku3: "",
  produto: "",
  medidas: "",
  largura: "",
  comprimento: "",
  altura: "",
  peso: "",
};

export default function CatalogPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const cursorRef = useRef(null);

  const fetchList = useCallback(async (reset) => {
    setLoading(true);
    try {
      const params = { limit: 30, search: search || undefined };
      if (!reset && cursorRef.current) params.cursor = cursorRef.current;
      const { data } = await api.get("/catalog", { params });
      if (reset) setItems(data.data);
      else setItems((prev) => [...prev, ...data.data]);
      setHasMore(data.hasNextPage);
      cursorRef.current = data.nextCursor;
    } catch {
      alert("Erro ao carregar catálogo");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    cursorRef.current = null;
    fetchList(true);
  }, [search, fetchList]);

  async function save() {
    if (!form.sku1.trim() || !form.produto.trim() || !form.medidas.trim()) {
      alert("SKU-1, produto e medidas são obrigatórios");
      return;
    }
    const L = Number(String(form.largura).replace(",", ".")) || 0;
    const C = Number(String(form.comprimento).replace(",", ".")) || 0;
    const A = Number(String(form.altura).replace(",", ".")) || 0;
    if (!L || !C || !A) {
      alert("Largura, comprimento e altura devem ser números válidos");
      return;
    }
    setSaving(true);
    try {
      await api.post("/catalog", {
        sku1: form.sku1.trim(),
        sku2: form.sku2.trim(),
        sku3: form.sku3.trim(),
        produto: form.produto.trim(),
        medidas: form.medidas.trim(),
        largura: L,
        comprimento: C,
        altura: A,
        peso: Number(String(form.peso).replace(",", ".")) || 0,
      });
      setModal(false);
      setForm(empty);
      cursorRef.current = null;
      fetchList(true);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Excluir este item?")) return;
    await api.delete(`/catalog/${id}`);
    cursorRef.current = null;
    fetchList(true);
  }

  async function onImport(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/catalog/import", fd);
      alert(`Importação: ${data.imported} novos, ${data.skipped} ignorados de ${data.total} linhas.`);
      cursorRef.current = null;
      fetchList(true);
    } catch {
      alert("Erro na importação (planilha precisa colunas SKU-1, PRODUTO, MEDIDAS, LARG, COMP, ALTURA, KG…)");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="text-brand-600" />
            Catálogo
          </h1>
          <p className="text-gray-500 mt-1">Dimensões e peso cúbico por SKU.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium cursor-pointer hover:bg-gray-50">
            <Upload size={16} />
            {importing ? "Importando…" : "Importar XLSX"}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} disabled={importing} />
          </label>
          <button
            type="button"
            onClick={() => {
              setForm(empty);
              setModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            <Plus size={16} />
            Novo
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm"
          placeholder="Buscar SKU ou produto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-600">
              <th className="px-3 py-2 font-medium">SKU-1</th>
              <th className="px-3 py-2 font-medium">Produto</th>
              <th className="px-3 py-2 font-medium">L×C×A</th>
              <th className="px-3 py-2 font-medium">Peso cub.</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((p) => (
              <tr key={p._id} className="hover:bg-gray-50/80">
                <td className="px-3 py-2 font-mono text-xs">{p.sku1}</td>
                <td className="px-3 py-2 max-w-[200px] truncate" title={p.produto}>
                  {p.produto}
                </td>
                <td className="px-3 py-2 text-gray-600 text-xs">
                  {p.largura}×{p.comprimento}×{p.altura}
                </td>
                <td className="px-3 py-2">{p.pesoCubico}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => remove(p._id)} className="text-red-500 p-1 rounded hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="text-center text-gray-500 py-8">Carregando…</p>}
        {!loading && items.length === 0 && <p className="text-center text-gray-500 py-12">Nenhum item.</p>}
        {hasMore && (
          <div className="p-4 text-center border-t border-gray-100">
            <button type="button" className="text-brand-600 text-sm font-medium" onClick={() => fetchList(false)}>
              Carregar mais
            </button>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">Novo produto</h3>
            {["sku1", "sku2", "sku3", "produto", "medidas"].map((k) => (
              <div key={k}>
                <label className="text-xs text-gray-600 uppercase">{k}</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-0.5"
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2">
              {["largura", "comprimento", "altura"].map((k) => (
                <div key={k}>
                  <label className="text-xs text-gray-600">{k}</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm mt-0.5"
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-600">Peso (kg)</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-0.5"
                value={form.peso}
                onChange={(e) => setForm({ ...form, peso: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="px-4 py-2 text-sm text-gray-600" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
