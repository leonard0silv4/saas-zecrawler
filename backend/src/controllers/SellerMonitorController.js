import mongoose from "mongoose";
import SellerPage from "../models/SellerPage.js";
import SellerProduct from "../models/SellerProduct.js";
import SellerAlert from "../models/SellerAlert.js";
import { getOwnerId } from "../middleware/auth.js";
import { runScraperForSeller } from "../services/sellerScraper.js";
import { enqueueSellerScrape, isSellerPending } from "../services/scraperQueue.js";

const oid = (id) => new mongoose.Types.ObjectId(String(id));

export default {
  async index(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const sellers = await SellerPage.find({ ownerId }).sort({ createdAt: -1 }).lean();

      const sellersWithStats = await Promise.all(
        sellers.map(async (seller) => {
          const totalProducts = await SellerProduct.countDocuments({ sellerId: seller._id });
          const unreadAlerts = await SellerAlert.countDocuments({ sellerId: seller._id, read: false });
          return { ...seller, totalProducts, unreadAlerts };
        })
      );

      return res.json(sellersWithStats);
    } catch (err) {
      console.error("[SellerMonitor] index:", err);
      return res.status(500).json({ error: "Erro ao listar sellers" });
    }
  },

  async store(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const { url, name } = req.body;
      if (!url) return res.status(400).json({ error: "URL é obrigatória" });

      const exists = await SellerPage.findOne({ url, ownerId });
      if (exists) return res.status(409).json({ error: "Seller já cadastrado" });

      const seller = await SellerPage.create({ url, name: name || "", ownerId });
      runScraperForSeller(seller).catch((err) => console.error("[SellerMonitor] scrape inicial:", err));

      return res.status(201).json(seller);
    } catch (err) {
      console.error("[SellerMonitor] store:", err);
      return res.status(500).json({ error: "Erro ao cadastrar seller" });
    }
  },

  async update(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const { id } = req.params;
      const { name, url } = req.body;

      const seller = await SellerPage.findOne({ _id: id, ownerId });
      if (!seller) return res.status(404).json({ error: "Seller não encontrado" });

      const urlChanged = url && url.trim() !== seller.url;

      if (urlChanged) {
        const conflict = await SellerPage.findOne({ url: url.trim(), ownerId, _id: { $ne: seller._id } });
        if (conflict) return res.status(409).json({ error: "URL já cadastrada para outro seller" });

        await SellerProduct.deleteMany({ sellerId: seller._id });
        await SellerAlert.deleteMany({ sellerId: seller._id });
      }

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (urlChanged) {
        updates.url = url.trim();
        updates.scraping = false;
        updates.lastRunAt = null;
        updates.scrapingStartedAt = null;
      }

      const updated = await SellerPage.findByIdAndUpdate(
        seller._id,
        { $set: updates },
        { new: true }
      );

      if (urlChanged) {
        runScraperForSeller(updated).catch((err) =>
          console.error("[SellerMonitor] re-scrape after URL update:", err)
        );
      }

      return res.json(updated);
    } catch (err) {
      console.error("[SellerMonitor] update:", err);
      return res.status(500).json({ error: "Erro ao atualizar seller" });
    }
  },

  async destroy(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const { id } = req.params;
      const seller = await SellerPage.findOne({ _id: id, ownerId });
      if (!seller) return res.status(404).json({ error: "Seller não encontrado" });

      await SellerProduct.deleteMany({ sellerId: seller._id });
      await SellerAlert.deleteMany({ sellerId: seller._id });
      await SellerPage.deleteOne({ _id: seller._id });
      return res.json({ ok: true });
    } catch (err) {
      console.error("[SellerMonitor] destroy:", err);
      return res.status(500).json({ error: "Erro ao remover seller" });
    }
  },

  async getProducts(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const { id } = req.params;
      const seller = await SellerPage.findOne({ _id: id, ownerId });
      if (!seller) return res.status(404).json({ error: "Seller não encontrado" });

      const products = await SellerProduct.find({ sellerId: seller._id })
        .sort({ isNew: -1, priceChanged: -1, updatedAt: -1 })
        .lean();
      return res.json(products);
    } catch (err) {
      console.error("[SellerMonitor] getProducts:", err);
      return res.status(500).json({ error: "Erro ao listar produtos" });
    }
  },

  async runScrape(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const { id } = req.params;
      const seller = await SellerPage.findOne({ _id: id, ownerId });
      if (!seller) return res.status(404).json({ error: "Seller não encontrado" });

      if (seller.scraping || isSellerPending(seller._id)) {
        return res.status(409).json({ error: "Scraping já em andamento ou na fila" });
      }

      await SellerPage.findByIdAndUpdate(seller._id, {
        $set: { scraping: true, scrapingStartedAt: new Date() },
      });
      enqueueSellerScrape(seller, runScraperForSeller);
      return res.status(202).json({ ok: true, message: "Scraping na fila" });
    } catch (err) {
      console.error("[SellerMonitor] runScrape:", err);
      return res.status(500).json({ error: "Erro ao iniciar scraping" });
    }
  },

  async getAlerts(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const { id } = req.params;
      const seller = await SellerPage.findOne({ _id: id, ownerId });
      if (!seller) return res.status(404).json({ error: "Seller não encontrado" });

      const alerts = await SellerAlert.find({ sellerId: seller._id }).sort({ createdAt: -1 }).lean();
      return res.json(alerts);
    } catch (err) {
      console.error("[SellerMonitor] getAlerts:", err);
      return res.status(500).json({ error: "Erro ao listar alertas" });
    }
  },

  async markAlertRead(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const { alertId } = req.params;
      const alert = await SellerAlert.findById(alertId).lean();
      if (!alert) return res.status(404).json({ error: "Alerta não encontrado" });
      const seller = await SellerPage.findOne({ _id: alert.sellerId, ownerId });
      if (!seller) return res.status(403).json({ error: "Sem permissão" });

      await SellerAlert.findByIdAndUpdate(alertId, { $set: { read: true } });
      return res.json({ ok: true });
    } catch (err) {
      console.error("[SellerMonitor] markAlertRead:", err);
      return res.status(500).json({ error: "Erro ao marcar alerta" });
    }
  },

  async resetStuck(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const { id } = req.params;
      const seller = await SellerPage.findOne({ _id: id, ownerId });
      if (!seller) return res.status(404).json({ error: "Seller não encontrado" });

      await SellerPage.findByIdAndUpdate(seller._id, {
        $set: { scraping: false, scrapingStartedAt: null },
      });
      return res.json({ ok: true });
    } catch (err) {
      console.error("[SellerMonitor] resetStuck:", err);
      return res.status(500).json({ error: "Erro ao resetar" });
    }
  },

  async markAllAlertsRead(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const { id } = req.params;
      const seller = await SellerPage.findOne({ _id: id, ownerId });
      if (!seller) return res.status(404).json({ error: "Seller não encontrado" });

      await SellerAlert.updateMany({ sellerId: id, read: false }, { $set: { read: true } });
      return res.json({ ok: true });
    } catch (err) {
      console.error("[SellerMonitor] markAllAlertsRead:", err);
      return res.status(500).json({ error: "Erro ao marcar alertas" });
    }
  },
};
