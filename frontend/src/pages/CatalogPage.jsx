import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calculator,
  CheckCircle2,
  Package,
  PackageCheck,
  PackagePlus,
  Pencil,
  Plus,
  Ruler,
  Search,
  Trash2,
  Upload,
  Weight,
  XCircle,
} from "lucide-react";
import api from "../services/api";
import { notifyError, notifySuccess, notifyWarning } from "../utils/notify.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

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
  const [editingId, setEditingId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [packageItems, setPackageItems] = useState([]);
  const [packageModal, setPackageModal] = useState(false);
  const [pkgLargura, setPkgLargura] = useState("");
  const [pkgComprimento, setPkgComprimento] = useState("");
  const [pkgAltura, setPkgAltura] = useState("");
  const [pkgPeso, setPkgPeso] = useState("");
  const [pkgResult, setPkgResult] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const cursorRef = useRef(null);
  const MARGEM_PESO = 0.05;

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
      notifyError("Erro ao carregar catálogo");
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
      notifyWarning("SKU-1, produto e medidas são obrigatórios");
      return;
    }
    const L = Number(String(form.largura).replace(",", ".")) || 0;
    const C = Number(String(form.comprimento).replace(",", ".")) || 0;
    const A = Number(String(form.altura).replace(",", ".")) || 0;
    if (!L || !C || !A) {
      notifyWarning("Largura, comprimento e altura devem ser números válidos");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        sku1: form.sku1.trim(),
        sku2: form.sku2.trim(),
        sku3: form.sku3.trim(),
        produto: form.produto.trim(),
        medidas: form.medidas.trim(),
        largura: L,
        comprimento: C,
        altura: A,
        peso: Number(String(form.peso).replace(",", ".")) || 0,
        pesoCubico: L > 0 && C > 0 && A > 0 ? Math.round(((L * C * A) / 6000) * 1000) / 1000 : 0,
      };
      if (editingId) {
        await api.put(`/catalog/${editingId}`, payload);
      } else {
        await api.post("/catalog", payload);
      }
      setModal(false);
      setForm(empty);
      setEditingId(null);
      cursorRef.current = null;
      fetchList(true);
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function remove(id) {
    setConfirmDialog({
      title: "Excluir item do catálogo",
      message: "Tem certeza? Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      onConfirm: async () => {
        await api.delete(`/catalog/${id}`);
        setConfirmDialog(null);
        cursorRef.current = null;
        fetchList(true);
      },
    });
  }

  async function onImport(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/catalog/import", fd);
      notifySuccess(`Importação: ${data.imported} novos, ${data.skipped} ignorados de ${data.total} linhas.`);
      cursorRef.current = null;
      fetchList(true);
    } catch {
      notifyError("Erro na importação (planilha precisa colunas SKU-1, PRODUTO, MEDIDAS, LARG, COMP, ALTURA, KG…)");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  function addToPackage(product) {
    setPackageItems((prev) => {
      if (prev.some((i) => i.product._id === product._id)) return prev;
      return [...prev, { product, qty: "1" }];
    });
  }

  function removeFromPackage(id) {
    setPackageItems((prev) => prev.filter((i) => i.product._id !== id));
  }

  function updatePackageQty(id, qty) {
    setPackageItems((prev) => prev.map((i) => (i.product._id === id ? { ...i, qty } : i)));
    setPkgResult(null);
  }

  function clearPackage() {
    setPackageItems([]);
    setPkgLargura("");
    setPkgComprimento("");
    setPkgAltura("");
    setPkgPeso("");
    setPkgResult(null);
  }

  function verifyPackage() {
    const l = Number(String(pkgLargura).replace(",", ".")) || 0;
    const c = Number(String(pkgComprimento).replace(",", ".")) || 0;
    const a = Number(String(pkgAltura).replace(",", ".")) || 0;
    const p = Number(String(pkgPeso).replace(",", ".")) || 0;

    const cubadoCaixa = (l * c * a) / 5900;
    const cubadoLimiteTotal = packageItems.reduce((sum, item) => {
      const q = Number(String(item.qty).replace(",", ".")) || 1;
      return sum + (item.product.pesoCubico || 0) * q;
    }, 0);
    const cubadoAprovado = cubadoCaixa <= cubadoLimiteTotal;

    const pesoEsperado = packageItems.reduce((sum, item) => {
      const q = Number(String(item.qty).replace(",", ".")) || 1;
      return sum + (item.product.peso || 0) * q;
    }, 0);
    const diferencaPeso = p - pesoEsperado;
    const diferencaPercent = pesoEsperado > 0 ? Math.abs(diferencaPeso) / pesoEsperado : 0;
    const pesoDivergente = pesoEsperado > 0 && diferencaPercent > MARGEM_PESO;

    setPkgResult({
      cubadoCaixa,
      cubadoLimiteTotal,
      cubadoAprovado,
      pesoInformado: p,
      pesoEsperado,
      diferencaPeso,
      diferencaPercent,
      pesoDivergente,
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package size={22} className="text-brand-600" />
            Dimensões e Peso
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
              setEditingId(null);
              setModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            <Plus size={16} />
            Novo
          </button>
          {packageItems.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setPackageModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
              >
                <PackageCheck size={16} />
                Verificar pacote ({packageItems.length})
              </button>
              <button
                type="button"
                onClick={clearPackage}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
              >
                <Trash2 size={16} />
                Limpar pacote
              </button>
            </>
          )}
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => addToPackage(p)}
                      title="Adicionar ao pacote"
                      className="text-emerald-600 p-1 rounded hover:bg-emerald-50"
                    >
                      <PackagePlus size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          sku1: p.sku1,
                          sku2: p.sku2 || "",
                          sku3: p.sku3 || "",
                          produto: p.produto,
                          medidas: p.medidas,
                          largura: String(p.largura),
                          comprimento: String(p.comprimento),
                          altura: String(p.altura),
                          peso: String(p.peso || ""),
                        });
                        setEditingId(p._id);
                        setModal(true);
                      }}
                      title="Editar"
                      className="text-brand-600 p-1 rounded hover:bg-brand-50"
                    >
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => remove(p._id)} className="text-red-500 p-1 rounded hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </div>
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

      {modal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setModal(false); setEditingId(null); }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">{editingId ? "Editar produto" : "Novo produto"}</h3>
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
              <button type="button" className="px-4 py-2 text-sm text-gray-600" onClick={() => { setModal(false); setEditingId(null); }}>
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
        </div>,
        document.body
      )}

      {packageModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setPackageModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <PackageCheck size={18} />
                Verificar Pacote
              </h3>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                {packageItems.length} item(ns)
              </span>
            </div>

            <div className="space-y-2">
              {packageItems.map((item) => (
                <div key={item.product._id} className="border border-gray-100 rounded-lg p-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.product.produto}</p>
                    <p className="text-xs text-gray-500">
                      SKU: {item.product.sku1} · P.Cúbico: {Number(item.product.pesoCubico || 0).toFixed(3)} kg · Peso: {Number(item.product.peso || 0).toFixed(3)} kg
                    </p>
                  </div>
                  <input
                    className="w-20 border border-gray-200 rounded px-2 py-1 text-sm text-center"
                    value={item.qty}
                    onChange={(e) => updatePackageQty(item.product._id, e.target.value)}
                    placeholder="Qtd"
                  />
                  <button type="button" onClick={() => removeFromPackage(item.product._id)} className="text-red-500 p-1 rounded hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1"><Ruler size={12} />Largura (cm)</label>
                <input className="w-full border border-gray-200 rounded px-2 py-2 text-sm mt-0.5" value={pkgLargura} onChange={(e) => { setPkgLargura(e.target.value); setPkgResult(null); }} />
              </div>
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1"><Ruler size={12} />Comprimento (cm)</label>
                <input className="w-full border border-gray-200 rounded px-2 py-2 text-sm mt-0.5" value={pkgComprimento} onChange={(e) => { setPkgComprimento(e.target.value); setPkgResult(null); }} />
              </div>
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1"><Ruler size={12} />Altura (cm)</label>
                <input className="w-full border border-gray-200 rounded px-2 py-2 text-sm mt-0.5" value={pkgAltura} onChange={(e) => { setPkgAltura(e.target.value); setPkgResult(null); }} />
              </div>
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1"><Weight size={12} />Peso total (kg)</label>
                <input className="w-full border border-gray-200 rounded px-2 py-2 text-sm mt-0.5" value={pkgPeso} onChange={(e) => { setPkgPeso(e.target.value); setPkgResult(null); }} />
              </div>
            </div>

            <button
              type="button"
              onClick={verifyPackage}
              disabled={!pkgLargura || !pkgComprimento || !pkgAltura || !pkgPeso || packageItems.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
            >
              <Calculator size={16} />
              Conferir pacote
            </button>

            {pkgResult && (
              <div className={`border rounded-lg p-4 space-y-3 ${pkgResult.cubadoAprovado ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
                <div className="flex items-center gap-2">
                  {pkgResult.cubadoAprovado ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-red-600" />}
                  <p className={`font-semibold ${pkgResult.cubadoAprovado ? "text-emerald-700" : "text-red-700"}`}>
                    {pkgResult.cubadoAprovado ? "APROVADO" : "REPROVADO"}
                  </p>
                  {pkgResult.pesoDivergente && <span className="text-amber-600 text-xs font-semibold">PESO DIVERGENTE</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Cubado do pacote</p>
                    <p className="font-mono font-semibold">{pkgResult.cubadoCaixa.toFixed(3)} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Limite total catálogo</p>
                    <p className="font-mono font-semibold text-blue-700">{pkgResult.cubadoLimiteTotal.toFixed(3)} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Peso informado</p>
                    <p className="font-mono">{pkgResult.pesoInformado.toFixed(3)} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Peso esperado</p>
                    <p className="font-mono">{pkgResult.pesoEsperado.toFixed(3)} kg</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 text-sm text-gray-600" onClick={() => setPackageModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={confirmDialog?.onConfirm}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  );
}
