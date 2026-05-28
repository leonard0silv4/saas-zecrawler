import Link from "../models/Link.js";
import { getOwnerId } from "../middleware/auth.js";
import { scrapeProductData, extractLinks } from "../utils/scraper.js";
import { emitSSE } from "../utils/sse.js";
import mongoose from "mongoose";

function isMercadoLivreUrl(raw) {
  try {
    const u = new URL(String(raw).trim());
    return /mercadolivre\.com|mercadolibre\.com/i.test(u.hostname);
  } catch {
    return false;
  }
}

export default {
  async index(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { page = 0, perPage = 20, storeName, tag, search, sku, seller, status, sortBy, sortDir } = req.query;

      const match = {
        ownerId: new mongoose.Types.ObjectId(ownerId),
      };
      if (storeName) match.storeName = storeName;
      if (tag) match.tags = tag;
      if (search) match.name = { $regex: search, $options: "i" };
      if (sku) match.sku = { $regex: sku, $options: "i" };
      if (seller) match.seller = seller;
      if (status === "winning") {
        match.$expr = { $and: [{ $gt: ["$nowPrice", "$myPrice"] }, { $gt: ["$myPrice", 0] }] };
      } else if (status === "losing") {
        match.$expr = { $and: [{ $lt: ["$nowPrice", "$myPrice"] }, { $gt: ["$myPrice", 0] }] };
      }

      const allowedSortFields = ["createdAt", "nowPrice", "myPrice", "name"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
      const sortOrder = sortDir === "asc" ? 1 : -1;

      const [result] = await Link.aggregate([
        { $match: match },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [
              { $sort: { [sortField]: sortOrder } },
              { $skip: (Number(page) - 1) * Number(perPage) },
              { $limit: Number(perPage) },
            ],
          },
        },
      ]);

      return res.json({
        data: result.data,
        total: result.metadata[0]?.total || 0,
        page: Number(page),
        perPage: Number(perPage),
      });
    } catch (err) {
      console.error("[Links] index error:", err);
      return res.status(500).json({ error: "Erro ao buscar links" });
    }
  },

  async store(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { link, myPrice, tag } = req.body;

      if (!link) return res.status(400).json({ error: "Link é obrigatório" });
      if (!isMercadoLivreUrl(link)) {
        return res.status(400).json({ error: "Apenas links do Mercado Livre são aceitos" });
      }

      const scraped = await scrapeProductData(link, ownerId);
      if (!scraped) return res.status(422).json({ error: "Não foi possível extrair dados do link" });

      const price = Number(scraped.offers?.price || 0);
      const existing = await Link.findOne({ sku: scraped.sku, ownerId, storeName: scraped.storeName });

      if (existing) {
        const updates = { status: scraped.offers?.availability };
        if (existing.nowPrice !== price && price > 0) {
          updates.lastPrice = existing.nowPrice;
          updates.nowPrice = price;
        }
        const updated = await Link.findByIdAndUpdate(existing._id, { $set: updates }, { new: true });
        return res.json(updated);
      }

      const newLink = await Link.create({
        sku: scraped.sku,
        link,
        name: scraped.name,
        status: scraped.offers?.availability,
        seller: scraped.seller,
        dateMl: scraped.dateMl,
        myPrice: Number(myPrice || 0),
        nowPrice: price,
        lastPrice: price,
        image: scraped.image,
        storeName: scraped.storeName,
        ratingSeller: scraped.ratingSeller,
        full: scraped.full,
        catalog: scraped.catalog,
        tags: tag ? [tag] : [],
        ownerId,
      });

      return res.status(201).json(newLink);
    } catch (err) {
      console.error("[Links] store error:", err);
      return res.status(500).json({ error: "Erro ao salvar link" });
    }
  },

  async storeBatch(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { link: listUrl, myPrice, tag } = req.body;

      if (!listUrl || !isMercadoLivreUrl(listUrl)) {
        return res.status(400).json({ error: "Apenas URLs de listagem do Mercado Livre são aceitas" });
      }

      const links = await extractLinks(listUrl, ownerId);
      if (!links.length) return res.status(422).json({ error: "Nenhum link encontrado na URL" });

      let created = 0;
      let updated = 0;

      for (const url of links) {
        try {
          const scraped = await scrapeProductData(url, ownerId);
          if (!scraped?.name) continue;

          const price = Number(scraped.offers?.price || 0);
          const existing = await Link.findOne({ link: url, ownerId });

          if (existing) {
            const updates = {};
            if (existing.nowPrice !== price && price > 0) {
              updates.lastPrice = existing.nowPrice;
              updates.nowPrice = price;
            }
            if (myPrice) updates.myPrice = Number(myPrice);
            if (Object.keys(updates).length) {
              await Link.findByIdAndUpdate(existing._id, { $set: updates });
            }
            updated++;
          } else {
            await Link.create({
              sku: scraped.sku,
              link: url,
              name: scraped.name,
              status: scraped.offers?.availability,
              seller: scraped.seller,
              dateMl: scraped.dateMl,
              myPrice: Number(myPrice || 0),
              nowPrice: price,
              lastPrice: price,
              image: scraped.image,
              storeName: scraped.storeName,
              full: scraped.full,
              catalog: scraped.catalog,
              tags: tag ? [tag] : [],
              ownerId,
            });
            created++;
          }
        } catch (e) {
          console.error(`[Links] batch item error: ${url}`, e.message);
        }
      }

      return res.json({ created, updated, total: links.length });
    } catch (err) {
      console.error("[Links] storeBatch error:", err);
      return res.status(500).json({ error: "Erro na importação em lote" });
    }
  },

  async update(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { id } = req.params;
      const { myPrice, tags } = req.body;

      const updates = {};
      if (myPrice !== undefined) updates.myPrice = myPrice;
      if (tags !== undefined) updates.tags = tags;

      if (!Object.keys(updates).length) {
        return res.status(400).json({ error: "Nenhum campo para atualizar" });
      }

      const link = await Link.findOneAndUpdate(
        { _id: id, ownerId },
        { $set: updates },
        { new: true }
      );

      if (!link) return res.status(404).json({ error: "Link não encontrado" });
      return res.json(link);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao atualizar link" });
    }
  },

  async destroy(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { id } = req.params;

      const result = await Link.findOneAndDelete({ _id: id, ownerId });
      if (!result) return res.status(404).json({ error: "Link não encontrado" });

      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao deletar link" });
    }
  },

  async destroyAll(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { storeName } = req.params;

      const result = await Link.deleteMany({ ownerId, storeName });
      return res.json({ deleted: result.deletedCount });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao limpar links" });
    }
  },

  async getTags(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const tags = await Link.distinct("tags", { ownerId });
      return res.json(tags);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao buscar tags" });
    }
  },

  async getSellers(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const sellers = await Link.distinct("seller", { ownerId });
      return res.json(sellers.filter(Boolean).sort());
    } catch (err) {
      return res.status(500).json({ error: "Erro ao buscar vendedores" });
    }
  },

  async getStats(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { storeName } = req.query;

      const match = { ownerId: new mongoose.Types.ObjectId(ownerId) };
      if (storeName) match.storeName = storeName;

      const [result] = await Link.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            losingCount: {
              $sum: {
                $cond: [
                  { $and: [{ $lt: ["$nowPrice", "$myPrice"] }, { $gt: ["$myPrice", 0] }] },
                  1, 0,
                ],
              },
            },
            losingPrices: {
              $push: {
                $cond: [
                  { $and: [{ $lt: ["$nowPrice", "$myPrice"] }, { $gt: ["$myPrice", 0] }] },
                  "$myPrice",
                  "$$REMOVE",
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalCount: 1,
            losingCount: 1,
            losingMedianPrice: { $avg: "$losingPrices" },
          },
        },
      ]);

      return res.json(result || { totalCount: 0, losingCount: 0, losingMedianPrice: 0 });
    } catch (err) {
      console.error("[Links] getStats error:", err);
      return res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  },

  async refresh(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { storeName } = req.params;

      const links = await Link.find({ ownerId, storeName }).sort({ createdAt: -1 });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for (let i = 0; i < links.length; i++) {
        try {
          const scraped = await scrapeProductData(links[i].link, ownerId);
          if (!scraped) continue;

          const newPrice = Number(scraped.offers?.price || 0);
          const changed =
            (newPrice > 0 && links[i].nowPrice !== newPrice) ||
            links[i].seller !== scraped.seller ||
            links[i].status !== scraped.offers?.availability;

          const updates = {
            status: scraped.offers?.availability || links[i].status,
            seller: scraped.seller,
            full: scraped.full,
            catalog: scraped.catalog,
            ratingSeller: scraped.ratingSeller,
          };

          if (newPrice > 0 && links[i].nowPrice !== newPrice) {
            updates.lastPrice = links[i].nowPrice;
            updates.nowPrice = newPrice;
          }

          await Link.findByIdAndUpdate(links[i]._id, {
            $set: updates,
            $push: {
              history: {
                $each: [{ price: newPrice || links[i].nowPrice, seller: scraped.seller }],
                $slice: -20,
              },
            },
          });

          if (changed) {
            res.write(`data: ${JSON.stringify({ ...updates, sku: links[i].sku, name: links[i].name })}\n\n`);
          }

          const pct = Math.round(((i + 1) / links.length) * 100);
          res.write(`data: ${pct}%\n\n`);
        } catch (e) {
          console.error(`[Links] refresh error for ${links[i].link}:`, e.message);
        }
      }

      res.end();
    } catch (err) {
      console.error("[Links] refresh error:", err);
      return res.status(500).json({ error: "Erro ao atualizar links" });
    }
  },

  async clearRates(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { storeName } = req.params;

      await Link.updateMany({ ownerId, storeName }, [{ $set: { lastPrice: "$nowPrice" } }]);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao limpar taxas" });
    }
  },
};
