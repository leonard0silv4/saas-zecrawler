import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Plus, Search, Trash2, Upload } from "lucide-react";
import api from "../services/api";

function mapXmlToNota(parsed) {
  const nota = parsed?.nfeProc?.NFe?.infNFe;
  if (!nota) return null;
  const det = nota.det;
  const dets = Array.isArray(det) ? det : det ? [det] : [];
  const produtos = dets.map((p) => ({
    code: p?.prod?.cProd,
    name: p?.prod?.xProd,
    ean: p?.prod?.cEAN || "",
    ncm: p?.prod?.NCM || "",
    quantity: parseFloat(p?.prod?.qCom) || 0,
    unitValue: parseFloat(p?.prod?.vUnCom) || 0,
    icmsValue: parseFloat(
      p?.imposto?.ICMS?.[Object.keys(p.imposto.ICMS || {})[0]]?.vICMS || 0
    ),
    ipiValue: parseFloat(p?.imposto?.IPI?.IPITrib?.vIPI || 0),
    totalValue: parseFloat(p?.prod?.vProd) || 0,
  }));
  const v = nota.total?.ICMSTot || {};
  return {
    fornecedor: {
      nome: nota.emit?.xNome || "",
      cnpj: nota.emit?.CNPJ || "",
      telefone: nota.emit?.enderEmit?.fone || "",
      endereco: "",
    },
    accessKey: nota.Id || "",
    numeroNota: nota.ide?.nNF || "",
    dataEmissao: nota.ide?.dhEmi ? new Date(nota.ide.dhEmi) : new Date(),
    valores: {
      vProd: parseFloat(v.vProd) || 0,
      vFrete: parseFloat(v.vFrete) || 0,
      vICMS: parseFloat(v.vICMS) || 0,
      vIPI: parseFloat(v.vIPI) || 0,
      vNF: parseFloat(v.vNF) || 0,
    },
    produtos,
    manual: false,
  };
}

export default function NfePage() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState("xml");
  const [parsing, setParsing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const cursorRef = useRef(null);

  const emptyManual = {
    fornecedor: { nome: "", cnpj: "", telefone: "", endereco: "" },
    numeroNota: "",
    accessKey: "",
    observations: "",
    dataEmissao: new Date().toISOString().slice(0, 10),
    valores: { vProd: 0, vFrete: 0, vICMS: 0, vIPI: 0, vNF: 0 },
    produtos: [
      { code: "", name: "", ean: "", ncm: "", quantity: 1, unitValue: 0, icmsValue: 0, ipiValue: 0, totalValue: 0 },
    ],
    manual: true,
  };

  const fetchList = useCallback(
    async (reset) => {
      setLoading(true);
      try {
        const params = { limit: 15, search: search || undefined };
        if (!reset && cursorRef.current) params.cursor = cursorRef.current;
        const { data } = await api.get("/nfe", { params });
        if (reset) setList(data.data);
        else setList((prev) => [...prev, ...data.data]);
        setHasMore(data.hasNextPage);
        cursorRef.current = data.nextCursor;
      } catch {
        alert("Erro ao listar notas");
      } finally {
        setLoading(false);
      }
    },
    [search]
  );

  useEffect(() => {
    cursorRef.current = null;
    fetchList(true);
  }, [search, fetchList]);

  async function onXml(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/nfe/parse", fd);
      const mapped = mapXmlToNota(data.data);
      if (!mapped) {
        alert("XML não parece ser uma NFe válida (nfeProc.NFe.infNFe)");
        return;
      }
      setForm(mapped);
      setTab("xml");
      setModal(true);
    } catch {
      alert("Erro ao ler XML");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  }

  function openManual() {
    setForm({ ...emptyManual, produtos: [...emptyManual.produtos] });
    setTab("manual");
    setModal(true);
  }

  async function saveNota() {
    if (!form) return;
    if (!form.numeroNota?.trim()) {
      alert("Número da nota é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        dataEmissao: form.dataEmissao instanceof Date ? form.dataEmissao : new Date(form.dataEmissao),
      };
      await api.post("/nfe", body);
      setModal(false);
      setForm(null);
      cursorRef.current = null;
      fetchList(true);
    } catch (err) {
      alert(err.response?.data?.error || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Excluir esta nota?")) return;
    await api.delete(`/nfe/${id}`);
    fetchList(true);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-brand-600" />
            Notas fiscais
          </h1>
          <p className="text-gray-500 mt-1">Importe XML de NFe ou cadastre manualmente.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium cursor-pointer hover:bg-gray-50">
            <Upload size={16} />
            {parsing ? "Lendo…" : "Importar XML"}
            <input type="file" accept=".xml,text/xml" className="hidden" onChange={onXml} disabled={parsing} />
          </label>
          <button
            type="button"
            onClick={openManual}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            <Plus size={16} />
            Manual
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm"
          placeholder="Buscar por fornecedor, SKU, número…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-600">
              <th className="px-4 py-3 font-medium">NF</th>
              <th className="px-4 py-3 font-medium">Fornecedor</th>
              <th className="px-4 py-3 font-medium">Emissão</th>
              <th className="px-4 py-3 font-medium text-right">Valor</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((n) => (
              <tr key={n._id} className="hover:bg-gray-50/80">
                <td className="px-4 py-3 font-mono text-xs">{n.numeroNota}</td>
                <td className="px-4 py-3">{n.fornecedor?.nome || "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {n.dataEmissao ? new Date(n.dataEmissao).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {n.valores?.vNF != null ? `R$ ${Number(n.valores.vNF).toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => remove(n._id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="text-center text-gray-500 py-8">Carregando…</p>}
        {!loading && list.length === 0 && <p className="text-center text-gray-500 py-12">Nenhuma nota.</p>}
        {hasMore && (
          <div className="p-4 text-center border-t border-gray-100">
            <button type="button" className="text-brand-600 text-sm font-medium" onClick={() => fetchList(false)}>
              Carregar mais
            </button>
          </div>
        )}
      </div>

      {modal && form && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setModal(false)}>
          <div
            className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg mb-4">{tab === "xml" ? "Revisar importação" : "Nova nota manual"}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-gray-600 text-xs">Número NF *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-0.5"
                  value={form.numeroNota}
                  onChange={(e) => setForm({ ...form, numeroNota: e.target.value })}
                />
              </div>
              <div>
                <label className="text-gray-600 text-xs">Fornecedor</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-0.5"
                  value={form.fornecedor.nome}
                  onChange={(e) => setForm({ ...form, fornecedor: { ...form.fornecedor, nome: e.target.value } })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-600 text-xs">CNPJ</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-0.5"
                    value={form.fornecedor.cnpj}
                    onChange={(e) => setForm({ ...form, fornecedor: { ...form.fornecedor, cnpj: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="text-gray-600 text-xs">Data emissão</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-0.5"
                    value={
                      form.dataEmissao instanceof Date
                        ? form.dataEmissao.toISOString().slice(0, 10)
                        : String(form.dataEmissao).slice(0, 10)
                    }
                    onChange={(e) => setForm({ ...form, dataEmissao: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-600 text-xs">Valor total NF</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-0.5"
                  value={form.valores.vNF}
                  onChange={(e) =>
                    setForm({ ...form, valores: { ...form.valores, vNF: parseFloat(e.target.value) || 0 } })
                  }
                />
              </div>
              <div>
                <label className="text-gray-600 text-xs">Produtos ({form.produtos.length})</label>
                <div className="mt-1 max-h-40 overflow-y-auto border border-gray-100 rounded-lg divide-y text-xs">
                  {form.produtos.map((p, i) => (
                    <div key={i} className="p-2 flex justify-between gap-2">
                      <span className="truncate flex-1">{p.name || p.code}</span>
                      <span className="text-gray-500 whitespace-nowrap">
                        {p.quantity} × R$ {Number(p.unitValue).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button type="button" className="px-4 py-2 text-sm text-gray-600" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveNota}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
