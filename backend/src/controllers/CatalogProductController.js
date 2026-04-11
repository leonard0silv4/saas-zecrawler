import xlsx from "xlsx";
import multer from "multer";
import CatalogProduct from "../models/CatalogProduct.js";
import { getOwnerId } from "../middleware/auth.js";

const upload = multer({ storage: multer.memoryStorage() });

function parseBrNumber(val) {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return Number(String(val).replace(/\./g, "").replace(",", ".")) || 0;
}

export default {
  async index(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { search, cursor, limit = 50 } = req.query;
      const query = { ownerId };

      if (search) {
        query.$or = [
          { sku1: { $regex: search, $options: "i" } },
          { sku2: { $regex: search, $options: "i" } },
          { produto: { $regex: search, $options: "i" } },
          { medidas: { $regex: search, $options: "i" } },
        ];
      }

      if (cursor && cursor !== "0") {
        const d = new Date(cursor);
        if (!isNaN(d.getTime())) query.createdAt = { $lt: d };
      }

      const lim = Number(limit);
      const produtos = await CatalogProduct.find(query).sort({ createdAt: -1 }).limit(lim + 1);
      const hasNextPage = produtos.length > lim;
      if (hasNextPage) produtos.pop();

      return res.json({
        data: produtos,
        nextCursor: hasNextPage ? produtos[produtos.length - 1].createdAt : null,
        hasNextPage,
      });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao buscar catálogo" });
    }
  },

  async store(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const product = new CatalogProduct({ ...req.body, ownerId });
      await product.save();
      return res.status(201).json(product);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: "SKU já cadastrado" });
      return res.status(400).json({ error: "Erro ao criar produto", details: err.message });
    }
  },

  async update(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const product = await CatalogProduct.findOneAndUpdate(
        { _id: req.params.id, ownerId },
        req.body,
        { new: true, runValidators: true }
      );
      if (!product) return res.status(404).json({ error: "Produto não encontrado" });
      return res.json(product);
    } catch (err) {
      return res.status(400).json({ error: "Erro ao atualizar", details: err.message });
    }
  },

  async destroy(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const product = await CatalogProduct.findOneAndDelete({ _id: req.params.id, ownerId });
      if (!product) return res.status(404).json({ error: "Produto não encontrado" });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao deletar" });
    }
  },

  async importFromXLS(req, res) {
    upload.single("file")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: "Erro no upload" });

      try {
        const ownerId = getOwnerId(req);
        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const allSku1 = rows.map((r) => String(r["SKU-1"] || "").trim()).filter(Boolean);
        const existing = await CatalogProduct.find({ sku1: { $in: allSku1 }, ownerId }).select("sku1");
        const existingSet = new Set(existing.map((p) => p.sku1));

        const toInsert = [];
        let skipped = 0;

        for (const row of rows) {
          const sku1 = String(row["SKU-1"] || "").trim();
          if (!sku1 || existingSet.has(sku1)) { skipped++; continue; }

          const l = parseBrNumber(row["LARG"]);
          const c = parseBrNumber(row["COMP"]);
          const a = parseBrNumber(row["ALTURA"]);

          toInsert.push({
            sku1, sku2: String(row["SKU-2"] || "").trim(), sku3: String(row["SKU-3"] || "").trim(),
            produto: String(row["PRODUTO"] || "").trim(), medidas: String(row["MEDIDAS"] || "").trim(),
            largura: l, comprimento: c, altura: a, peso: parseBrNumber(row["KG"]),
            pesoCubico: l > 0 && c > 0 && a > 0 ? Math.round(((l * c * a) / 6000) * 1000) / 1000 : 0,
            ownerId,
          });
        }

        const inserted = toInsert.length ? await CatalogProduct.insertMany(toInsert, { ordered: false }) : [];

        return res.status(201).json({
          total: rows.length, imported: inserted.length, skipped,
        });
      } catch (e) {
        return res.status(500).json({ error: "Erro ao importar" });
      }
    });
  },
};
