import mongoose from "mongoose";
import { ExpedicaoRegistro, ExpedicaoMeta, ExpedicaoDiaEncerrado } from "../models/Expedicao.js";
import { getOwnerId } from "../middleware/auth.js";
import { emitSSE } from "../utils/sse.js";

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const nextDay = (d = new Date()) => { const x = startOfDay(d); x.setDate(x.getDate() + 1); return x; };
const fmtDate = (d) => d.toISOString().split("T")[0];

const MESAS = ["M1", "M2", "M3", "M4"];
const SELLERS = ["mercadoLivre", "outros"];
const HOURS = Array.from({ length: 10 }, (_, i) => {
  const h = i + 7;
  return `${String(h).padStart(2, "0")}:00 às ${String(h + 1).padStart(2, "0")}:00`;
});

async function getDataContabilizacao(ownerId) {
  const hoje = startOfDay();
  const encerrado = await ExpedicaoDiaEncerrado.findOne({ data: hoje, ownerId });
  return encerrado ? nextDay(hoje) : hoje;
}

export default {
  async verificar(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const registro = await ExpedicaoRegistro.findOne({ orderId: req.params.orderId, ownerId });

      if (registro) {
        return res.json({ existe: true, registro });
      }
      return res.status(404).json({ existe: false });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao verificar código" });
    }
  },

  async registrar(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { orderId, mesaId, seller } = req.body;

      if (!orderId || !mesaId) return res.status(400).json({ error: "orderId e mesaId são obrigatórios" });
      if (!MESAS.includes(mesaId)) return res.status(400).json({ error: "mesaId inválido" });
      if (seller && !SELLERS.includes(seller)) return res.status(400).json({ error: "seller inválido" });

      const existe = await ExpedicaoRegistro.findOne({ orderId, ownerId });
      if (existe) return res.status(409).json({ error: "Código já registrado", registroAnterior: existe });

      const hoje = startOfDay();
      const diaEncerrado = await ExpedicaoDiaEncerrado.findOne({ data: hoje, ownerId });
      const dataContabilizacao = diaEncerrado ? nextDay(hoje) : hoje;

      const registro = await ExpedicaoRegistro.create({
        orderId, mesaId, seller: seller || null, dataContabilizacao, ownerId,
      });

      emitSSE(ownerId, "expedicao:update", {
        tipo: "novo_pacote", mesa: mesaId, orderId, seller, dataContabilizacao: fmtDate(dataContabilizacao),
      });

      return res.status(201).json({
        registro,
        diaEncerrado: !!diaEncerrado,
        dataContabilizacao: fmtDate(dataContabilizacao),
      });
    } catch (err) {
      console.error("[Expedicao] registrar error:", err);
      return res.status(500).json({ error: "Erro ao registrar pacote" });
    }
  },

  async verificarDiaEncerrado(req, res) {
    try {
      const ownerId = new mongoose.Types.ObjectId(getOwnerId(req));
      const { data } = req.query;
      let dataVerificar = data ? startOfDay(new Date(data)) : startOfDay();

      const diaEncerrado = await ExpedicaoDiaEncerrado.findOne({ data: dataVerificar, ownerId });

      if (diaEncerrado) {
        const proximo = nextDay(dataVerificar);
        return res.json({
          encerrado: true,
          data: fmtDate(dataVerificar),
          encerradoEm: diaEncerrado.encerradoEm,
          totalPacotes: diaEncerrado.totalPacotes,
          proximoDiaUtil: fmtDate(proximo),
        });
      }

      return res.json({ encerrado: false, data: fmtDate(dataVerificar) });
    } catch (err) {
      console.error("[Expedicao] verificarDiaEncerrado:", err);
      return res.status(500).json({ error: "Erro ao verificar dia" });
    }
  },

  async obterMeta(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const data = req.query.data ? startOfDay(new Date(req.query.data)) : await getDataContabilizacao(ownerId);
      const diaEncerrado = await ExpedicaoDiaEncerrado.findOne({ data: startOfDay(), ownerId });
      const meta = await ExpedicaoMeta.findOne({ data, ownerId });

      return res.json({
        data: fmtDate(data),
        diaEncerrado: !!diaEncerrado,
        ...(meta ? meta.toObject() : {
          tipoConfiguracao: null, total: 0,
          porSeller: { mercadoLivre: 0, outros: 0 },
          horariosColeta: { mercadoLivre: "11:00", outros: "17:30" },
        }),
      });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao obter meta" });
    }
  },

  async configurarMeta(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { tipoConfiguracao, total, porSeller, horariosColeta, data } = req.body;

      if (!["total", "porSeller"].includes(tipoConfiguracao)) {
        return res.status(400).json({ error: "tipoConfiguracao deve ser 'total' ou 'porSeller'" });
      }

      const dataMeta = data ? startOfDay(new Date(data)) : await getDataContabilizacao(ownerId);

      const meta = await ExpedicaoMeta.findOneAndUpdate(
        { data: dataMeta, ownerId },
        {
          data: dataMeta, ownerId, tipoConfiguracao,
          total: tipoConfiguracao === "total" ? total : null,
          porSeller: tipoConfiguracao === "porSeller" ? porSeller : null,
          horariosColeta: horariosColeta || undefined,
        },
        { new: true, upsert: true }
      );

      return res.json({ meta });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao configurar meta" });
    }
  },

  async encerrarDia(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const dataEncerrar = req.body.data ? startOfDay(new Date(req.body.data)) : startOfDay();

      if (dataEncerrar > startOfDay()) {
        return res.status(400).json({ error: "Não é possível encerrar dias futuros" });
      }

      const ja = await ExpedicaoDiaEncerrado.findOne({ data: dataEncerrar, ownerId });
      if (ja) return res.status(409).json({ error: "Dia já encerrado", encerradoEm: ja.encerradoEm });

      const totalPacotes = await ExpedicaoRegistro.countDocuments({ dataContabilizacao: dataEncerrar, ownerId });

      const diaEncerrado = await ExpedicaoDiaEncerrado.create({
        data: dataEncerrar, encerradoEm: new Date(),
        encerradoPor: String(req.user.id), totalPacotes, ownerId,
      });

      emitSSE(ownerId, "expedicao:dia_encerrado", { data: fmtDate(dataEncerrar), totalPacotes });

      return res.json({ diaEncerrado, proximoDia: fmtDate(nextDay(dataEncerrar)) });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao encerrar dia" });
    }
  },

  async dashboard(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { data } = req.query;

      if (!data) return res.status(400).json({ error: "Parâmetro 'data' obrigatório (YYYY-MM-DD)" });

      const [year, month, day] = data.split("-").map(Number);
      const dataConsulta = new Date(year, month - 1, day, 0, 0, 0, 0);
      if (isNaN(dataConsulta.getTime())) return res.status(400).json({ error: "Data inválida" });

      const [diaEncerrado, meta, registros, porSellerAgg] = await Promise.all([
        ExpedicaoDiaEncerrado.findOne({ data: dataConsulta, ownerId }),
        ExpedicaoMeta.findOne({ data: dataConsulta, ownerId }),
        ExpedicaoRegistro.find({ dataContabilizacao: dataConsulta, ownerId }),
        ExpedicaoRegistro.aggregate([
          {
            $match: {
              dataContabilizacao: dataConsulta,
              ownerId: new mongoose.Types.ObjectId(getOwnerId(req)),
            },
          },
          { $group: { _id: "$seller", count: { $sum: 1 } } },
        ]),
      ]);

      // Build porSeller
      const porSeller = {};
      SELLERS.forEach((s) => {
        const found = porSellerAgg.find((a) => a._id === s);
        const atual = found?.count || 0;
        if (meta?.tipoConfiguracao === "porSeller") {
          const metaVal = meta.porSeller?.[s] || 0;
          porSeller[s] = { atual, meta: metaVal, pct: metaVal > 0 ? (atual / metaVal) * 100 : 0 };
        } else {
          porSeller[s] = atual;
        }
      });

      // Build porMesa
      const hoje = startOfDay();
      const porMesa = {};
      for (const mesa of MESAS) {
        const mesaRegs = registros.filter((r) => r.mesaId === mesa);
        const porHora = {};
        HOURS.forEach((h) => (porHora[h] = 0));
        mesaRegs.forEach((r) => {
          const h = r.createdAt.getHours();
          const key = `${String(h).padStart(2, "0")}:00 às ${String(h + 1).padStart(2, "0")}:00`;
          if (porHora[key] !== undefined) porHora[key]++;
        });

        let ritmoAtual = 0;
        if (fmtDate(dataConsulta) === fmtDate(hoje)) {
          const umHoraAtras = new Date(Date.now() - 3600000);
          ritmoAtual = await ExpedicaoRegistro.countDocuments({
            mesaId: mesa, ownerId, createdAt: { $gte: umHoraAtras },
          });
        }

        porMesa[mesa] = { totalDia: mesaRegs.length, ritmoAtual, porHora };
      }

      const totalGeral = registros.length;
      const pctConcluida = meta?.tipoConfiguracao === "total" && meta.total > 0
        ? (totalGeral / meta.total) * 100 : null;

      return res.json({
        data: fmtDate(dataConsulta),
        diaEncerrado: !!diaEncerrado,
        meta: meta ? { tipoConfiguracao: meta.tipoConfiguracao, total: meta.total, porSeller: meta.porSeller, horariosColeta: meta.horariosColeta } : null,
        totalGeral, porcentagemConcluida: pctConcluida, porSeller, porMesa,
      });
    } catch (err) {
      console.error("[Expedicao] dashboard error:", err);
      return res.status(500).json({ error: "Erro ao montar dashboard" });
    }
  },
};
