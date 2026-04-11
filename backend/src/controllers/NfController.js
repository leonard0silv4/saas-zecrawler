import multer from "multer";
import mongoose from "mongoose";
import { parseStringPromise } from "xml2js";
import NfeEntry from "../models/Nf.js";
import { getOwnerId } from "../middleware/auth.js";

const upload = multer({ storage: multer.memoryStorage() });

export default {
  async parseXml(req, res) {
    upload.single("file")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: "Erro no upload" });
      try {
        const xml = req.file.buffer.toString("utf-8");
        const parsed = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true, trim: true });
        return res.json({ data: parsed });
      } catch (e) {
        return res.status(500).json({ error: "Erro ao processar XML" });
      }
    });
  },

  async index(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { search, startDate, endDate, cursor, limit = 20 } = req.query;
      const query = { ownerId };

      if (search) {
        query.$or = [
          { "fornecedor.nome": { $regex: search, $options: "i" } },
          { "fornecedor.cnpj": { $regex: search, $options: "i" } },
          { "produtos.name": { $regex: search, $options: "i" } },
          { "produtos.sku": { $regex: search, $options: "i" } },
          { numeroNota: { $regex: search, $options: "i" } },
        ];
      }

      if (startDate && endDate) {
        query.dataEmissao = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      if (cursor && cursor !== "0") {
        const d = new Date(cursor);
        if (!isNaN(d.getTime())) query.createdAt = { $lt: d };
      }

      const lim = Number(limit);
      const notas = await NfeEntry.find(query).sort({ dataEmissao: -1 }).limit(lim + 1);
      const hasNextPage = notas.length > lim;
      if (hasNextPage) notas.pop();

      return res.json({
        data: notas,
        nextCursor: hasNextPage ? notas[notas.length - 1].createdAt : null,
        hasNextPage,
      });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao buscar notas" });
    }
  },

  async store(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { fornecedor, numeroNota, dataEmissao, valores, produtos, manual, accessKey, observations } = req.body;

      const exists = await NfeEntry.findOne({ numeroNota, ownerId });
      if (exists) return res.status(409).json({ error: "Número da nota fiscal já existe" });

      // Check price changes against previous notes
      const observationHistory = [];
      for (const produto of produtos) {
        const lastNota = await NfeEntry.findOne({ "produtos.code": produto.code, ownerId }).sort({ createdAt: -1 });
        const prevProd = lastNota?.produtos.find((p) => p.code === produto.code);

        if (prevProd && prevProd.unitValue !== produto.unitValue) {
          observationHistory.push({
            code: produto.code,
            unitValueAnterior: prevProd.unitValue,
            unitValueAtual: produto.unitValue,
            diferenca: +(produto.unitValue - prevProd.unitValue).toFixed(2),
            numeroNotaAnterior: lastNota.numeroNota,
            fornecedorAnterior: lastNota.fornecedor?.nome || "",
            dataNotaAnterior: lastNota.dataEmissao,
          });
        }
      }

      const nota = await NfeEntry.create({
        fornecedor, numeroNota, accessKey,
        dataEmissao: dataEmissao || new Date(),
        valores, produtos, manual, observations,
        observation_history: observationHistory,
        criadoPor: req.user.id, ownerId,
      });

      return res.status(201).json(nota);
    } catch (err) {
      console.error("[NF] store error:", err);
      return res.status(500).json({ error: "Erro ao salvar nota fiscal" });
    }
  },

  async show(req, res) {
    const ownerId = new mongoose.Types.ObjectId(getOwnerId(req));
    const nota = await NfeEntry.findOne({ _id: req.params.id, ownerId });
    if (!nota) return res.status(404).json({ error: "Nota não encontrada" });
    return res.json(nota);
  },

  async update(req, res) {
    const ownerId = new mongoose.Types.ObjectId(getOwnerId(req));
    const nota = await NfeEntry.findOne({ _id: req.params.id, ownerId });
    if (!nota || !nota.manual) return res.status(400).json({ error: "Nota não editável" });
    Object.assign(nota, req.body);
    await nota.save();
    return res.json(nota);
  },

  async destroy(req, res) {
    const ownerId = new mongoose.Types.ObjectId(getOwnerId(req));
    const r = await NfeEntry.findOneAndDelete({ _id: req.params.id, ownerId });
    if (!r) return res.status(404).json({ error: "Nota não encontrada" });
    return res.json({ ok: true });
  },
};
