import { useEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Package, Scan } from "lucide-react";
import api from "../services/api";
import { notifyError, notifyWarning } from "../utils/notify.js";

function identificarSeller(codigo) {
  const c = codigo.trim();
  if (/^\d{11}$/.test(c)) return { seller: "mercadoLivre", ok: true };
  if (/^BLO:\d{8}$/.test(c)) return { seller: "outros", ok: true };
  return { seller: null, ok: false, err: "Código não reconhecido (Mercado Livre 11 dígitos ou BLO:########)" };
}

const MESAS = ["M1", "M2", "M3", "M4"];

export default function ExpedicaoPage() {
  const [codigo, setCodigo] = useState("");
  const [mesaModal, setMesaModal] = useState(false);
  const [pendingSeller, setPendingSeller] = useState(null);
  const [diaEncerrado, setDiaEncerrado] = useState(false);
  const [proximoDia, setProximoDia] = useState("");
  const [ultimo, setUltimo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState(null);
  const inputRef = useRef(null);

  const [dashDate, setDashDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dashboard, setDashboard] = useState(null);
  const [loadingDash, setLoadingDash] = useState(false);

  async function checkDia() {
    try {
      const { data } = await api.get("/expedicao/dia-encerrado");
      setDiaEncerrado(!!data.encerrado);
      if (data.encerrado) setProximoDia(data.proximoDiaUtil || "");
    } catch {
      /* ignore */
    }
  }

  async function loadDashboard() {
    setLoadingDash(true);
    try {
      const { data } = await api.get("/expedicao/dashboard", { params: { data: dashDate } });
      setDashboard(data);
    } catch {
      setDashboard(null);
    } finally {
      setLoadingDash(false);
    }
  }

  useEffect(() => {
    checkDia();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [dashDate]);

  async function onScan(e) {
    e.preventDefault();
    const raw = codigo.trim();
    if (!raw) return;
    setBusy(true);
    setDup(null);
    try {
      const { data: v } = await api.get(`/expedicao/verificar/${encodeURIComponent(raw)}`);
      if (v.existe) {
        setDup(v.registro);
        setBusy(false);
        return;
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setBusy(false);
        notifyError("Erro ao verificar código");
        return;
      }
    }
    const id = identificarSeller(raw);
    if (!id.ok) {
      notifyWarning(id.err);
      setBusy(false);
      return;
    }
    setPendingSeller(id.seller);
    setMesaModal(true);
    setBusy(false);
  }

  async function registrarMesa(mesaId) {
    if (!codigo.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/expedicao/registrar", {
        orderId: codigo.trim(),
        mesaId,
        seller: pendingSeller,
      });
      setUltimo({ orderId: codigo.trim(), mesa: mesaId, data: data.dataContabilizacao });
      setCodigo("");
      setMesaModal(false);
      setPendingSeller(null);
      loadDashboard();
    } catch (err) {
      if (err.response?.status === 409) {
        setDup(err.response.data.registroAnterior);
      } else notifyError(err.response?.data?.error || "Erro ao registrar");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const chartMesas =
    dashboard?.porMesa &&
    MESAS.map((m) => ({
      mesa: m,
      pacotes: dashboard.porMesa[m]?.totalDia ?? 0,
    }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="text-brand-600" />
          Expedição
        </h1>
        <p className="text-gray-500 mt-1">Bipe o código e escolha a mesa para registrar o pacote.</p>
        {diaEncerrado && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
            Dia operacional encerrado. Próxima contagem: <strong>{proximoDia}</strong>
          </p>
        )}
      </div>

      <form onSubmit={onScan} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Scan size={16} /> Código de barras
        </label>
        <input
          ref={inputRef}
          className="mt-2 w-full text-lg border border-gray-200 rounded-lg px-4 py-3 font-mono tracking-wide"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Escaneie ou digite o código"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full sm:w-auto px-6 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? "Processando…" : "Continuar"}
        </button>
        {ultimo && (
          <p className="text-sm text-emerald-700 mt-4">
            Último: <strong>{ultimo.orderId}</strong> na {ultimo.mesa} ({ultimo.data})
          </p>
        )}
      </form>

      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <div>
            <h2 className="font-semibold text-gray-900">Dashboard do dia</h2>
            <p className="text-sm text-gray-500">Volume por mesa</p>
          </div>
          <input
            type="date"
            value={dashDate}
            onChange={(e) => setDashDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm sm:ml-auto"
          />
        </div>
        {loadingDash ? (
          <p className="text-gray-500 text-sm">Carregando…</p>
        ) : chartMesas ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartMesas}>
                <XAxis dataKey="mesa" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="pacotes" name="Pacotes" fill="#0c8ee9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Sem dados para esta data.</p>
        )}
        {dashboard && (
          <p className="text-sm text-gray-600 mt-4">
            Total geral: <strong>{dashboard.totalGeral}</strong>
            {dashboard.diaEncerrado && <span className="ml-2 text-amber-700">· Dia encerrado</span>}
          </p>
        )}
      </section>

      {mesaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && setMesaModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-4">Escolha a mesa</h3>
            <div className="grid grid-cols-2 gap-2">
              {MESAS.map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={busy}
                  onClick={() => registrarMesa(m)}
                  className="py-4 rounded-xl border-2 border-gray-100 hover:border-brand-500 hover:bg-brand-50 font-semibold text-gray-800"
                >
                  {m}
                </button>
              ))}
            </div>
            <button type="button" className="mt-4 text-sm text-gray-500 w-full" onClick={() => setMesaModal(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {dup && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDup(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-red-700">Código já registrado</h3>
            <p className="text-sm text-gray-600 mt-2">
              Mesa: <strong>{dup.mesaId}</strong>
              <br />
              Em: {dup.createdAt ? new Date(dup.createdAt).toLocaleString("pt-BR") : "—"}
            </p>
            <button type="button" className="mt-4 w-full py-2 rounded-lg bg-gray-100 text-gray-800" onClick={() => setDup(null)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
