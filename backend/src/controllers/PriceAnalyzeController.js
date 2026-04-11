import mongoose from "mongoose";
import Link from "../models/Link.js";
import PriceAnalyzeSnapshot from "../models/PriceAnalyzeSnapshot.js";
import { getOwnerId } from "../middleware/auth.js";
import { buildProductGroupsFromLinks, MY_STORE_TAG } from "../utils/priceAnalyzeFromLinks.js";
import { buildPriceAnalyzeXml } from "../utils/buildPriceAnalyzeXml.js";
import { scrapePriceAnalyzeFromLinks } from "../services/mlPriceAnalyzeScraper.js";

export default {
  /** Visão rápida (apenas dados já salvos nos links — sem scrape completo). */
  async index(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { storeName } = req.query;
      const match = { ownerId: new mongoose.Types.ObjectId(ownerId) };
      if (storeName) match.storeName = storeName;

      const links = await Link.find(match).sort({ updatedAt: -1 }).lean();
      const productGroups = buildProductGroupsFromLinks(links);
      const extractionDate = new Date().toISOString();

      return res.json({
        productGroups,
        extractionDate,
        hint: `Use a tag "${MY_STORE_TAG}" nos seus links para marcar anúncios próprios.`,
      });
    } catch (err) {
      console.error("[PriceAnalyze] error:", err);
      return res.status(500).json({ error: "Erro ao montar análise" });
    }
  },

  /** Último XML gerado (equivalente ao download do backend antigo). */
  async xml(req, res) {
    try {
      const ownerId = new mongoose.Types.ObjectId(getOwnerId(req));
      const snap = await PriceAnalyzeSnapshot.findOne({ ownerId }).lean();
      if (!snap?.xml) {
        return res.status(404).json({ error: "Nenhum XML gerado ainda. Use POST /price-analyze/generate." });
      }
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="produtos_mercadolivre.xml"');
      return res.send(snap.xml);
    } catch (err) {
      console.error("[PriceAnalyze] xml:", err);
      return res.status(500).json({ error: "Erro ao ler XML" });
    }
  },

  /**
   * Gera XML a partir dos links cadastrados (fluxo do script Python, em Node).
   * Envia cookies ML (tela de cookies + opcional ML_COOKIE_STRING no .env).
   */
  async generate(req, res) {
    try {
      req.setTimeout(0);
      if (req.socket) req.socket.setTimeout(0);

      const ownerId = getOwnerId(req);
      const oid = new mongoose.Types.ObjectId(ownerId);
      const { storeName, limit: limRaw } = req.body || {};
      const limit = Math.min(Math.max(Number(limRaw) || 300, 1), 500);

      const match = { ownerId: oid };
      if (storeName) match.storeName = storeName;

      const links = await Link.find(match).sort({ updatedAt: -1 }).limit(limit).select("link").lean();
      if (!links.length) {
        return res.status(400).json({ error: "Nenhum link para processar" });
      }

      const rows = await scrapePriceAnalyzeFromLinks(links, ownerId, {
        onProgress: ({ current, total, url }) => {
          if (current % 5 === 0 || current === total) {
            console.log(`[PriceAnalyze] ${current}/${total} ${url?.slice(0, 80)}`);
          }
        },
      });

      const now = new Date();
      const xml = buildPriceAnalyzeXml(rows, now);

      await PriceAnalyzeSnapshot.findOneAndUpdate(
        { ownerId: oid },
        {
          ownerId: oid,
          xml,
          extractionDate: now,
          rowCount: rows.filter((r) => r.preco > 0).length,
          sourceUrlCount: links.length,
        },
        { upsert: true, new: true }
      );

      return res.json({
        ok: true,
        extractionDate: now.toISOString(),
        urlsProcessadas: links.length,
        linhasProduto: rows.filter((r) => r.preco > 0).length,
        message:
          "XML salvo. Use GET /price-analyze/xml ou recarregue a tela de análise.",
      });
    } catch (err) {
      console.error("[PriceAnalyze] generate:", err);
      return res.status(500).json({ error: "Erro ao gerar XML", details: err.message });
    }
  },
};
