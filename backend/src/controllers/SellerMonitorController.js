import mongoose from "mongoose";
import SellerPage from "../models/SellerPage.js";
import SellerProduct from "../models/SellerProduct.js";
import SellerAlert from "../models/SellerAlert.js";
import { getOwnerId } from "../middleware/auth.js";
import CatalogScanState from "../models/CatalogScanState.js";
import { runScraperForSeller } from "../services/sellerScraper.js";
import { enqueueSellerScrape, isSellerPending } from "../services/scraperQueue.js";
import {
  scanOwnerCatalogs,
  isOwnerScanRunning,
  listCompetitors,
  MAX_CATEGORIES,
  MAX_CATALOGS_PER_SCAN,
} from "../services/catalogScanner.js";
import { parseListingUrl, getOwnerMeliToken, mlGet } from "../utils/meliProductApi.js";

const INVALID_SELLER_URL =
  "URL não reconhecida. Use a página do vendedor (/pagina/NICK ou /perfil/NICK), uma listagem com _CustId_ ou escolha um concorrente encontrado.";
const MIN_SCAN_INTERVAL_MS = 15 * 60 * 1000;

/** URL precisa identificar o vendedor (id ou nickname); termo de busca sozinho não serve mais. */
function sellerFromUrl(url) {
  const p = parseListingUrl(url);
  return p && (p.seller_id || p.nickname) ? p : null;
}

let categoriesCache = { at: 0, data: null };

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
      const { name } = req.body;
      const mlSellerId = Number(req.body.mlSellerId) || null;
      const nickname = String(req.body.nickname || "").trim();
      // Concorrente escolhido da lista → URL de perfil derivada do nickname
      const url = mlSellerId
        ? `https://www.mercadolivre.com.br/perfil/${encodeURIComponent(nickname || mlSellerId)}`
        : String(req.body.url || "").trim();
      if (!url) return res.status(400).json({ error: "Informe a URL do vendedor ou escolha um concorrente" });
      if (!mlSellerId && !sellerFromUrl(url)) return res.status(400).json({ error: INVALID_SELLER_URL });

      const exists = await SellerPage.findOne({ ownerId, $or: [{ url }, ...(mlSellerId ? [{ mlSellerId }] : [])] });
      if (exists) return res.status(409).json({ error: "Seller já cadastrado" });

      const seller = await SellerPage.create({ url, name: name || nickname || "", mlSellerId, nickname, ownerId });
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

      if (urlChanged && !sellerFromUrl(url)) {
        return res.status(400).json({ error: INVALID_SELLER_URL });
      }
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
        updates.mlSellerId = null;
        updates.nickname = "";
        updates.noData = false;
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

  /** Estado da varredura de catálogos do owner + categorias escolhidas. */
  async scanStatus(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const state = await CatalogScanState.findOne({ ownerId }).lean();
      return res.json({
        categories: state?.categories || [],
        lastRunAt: state?.lastRunAt || null,
        catalogCount: state?.catalogCount || 0,
        sellerCount: state?.sellerCount || 0,
        lastError: state?.lastError || null,
        running: isOwnerScanRunning(ownerId),
        maxCategories: MAX_CATEGORIES,
        maxCatalogs: MAX_CATALOGS_PER_SCAN,
      });
    } catch (err) {
      console.error("[SellerMonitor] scanStatus:", err);
      return res.status(500).json({ error: "Erro ao carregar varredura" });
    }
  },

  /** Dispara a varredura de catálogos e, em seguida, atualiza todos os sellers do owner. */
  async runScan(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      if (isOwnerScanRunning(ownerId)) return res.status(409).json({ error: "Varredura já em andamento" });

      const state = await CatalogScanState.findOne({ ownerId }).lean();
      if (state?.lastRunAt && Date.now() - new Date(state.lastRunAt).getTime() < MIN_SCAN_INTERVAL_MS) {
        return res.status(429).json({ error: "Aguarde 15 minutos entre varreduras" });
      }

      (async () => {
        await scanOwnerCatalogs(ownerId);
        const sellers = await SellerPage.find({ ownerId, active: true });
        for (const seller of sellers) await runScraperForSeller(seller, { scanMaxAgeMs: Infinity });
      })().catch((err) => console.error("[SellerMonitor] runScan:", err));

      return res.status(202).json({ ok: true });
    } catch (err) {
      console.error("[SellerMonitor] runScan:", err);
      return res.status(500).json({ error: "Erro ao iniciar varredura" });
    }
  },

  async updateCategories(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const { categories } = req.body;
      if (!Array.isArray(categories)) return res.status(400).json({ error: "categories deve ser um array" });

      const seen = new Set();
      const clean = categories
        .map((c) => ({ id: String(c?.id || "").trim().toUpperCase(), name: String(c?.name || "").trim().slice(0, 120) }))
        .filter((c) => /^MLB\d+$/.test(c.id) && !seen.has(c.id) && seen.add(c.id));
      if (clean.length > MAX_CATEGORIES) {
        return res.status(400).json({ error: `Escolha no máximo ${MAX_CATEGORIES} categorias` });
      }

      await CatalogScanState.findOneAndUpdate({ ownerId }, { $set: { categories: clean } }, { upsert: true });
      return res.json({ categories: clean });
    } catch (err) {
      console.error("[SellerMonitor] updateCategories:", err);
      return res.status(500).json({ error: "Erro ao salvar categorias" });
    }
  },

  /** Categorias do ML: raiz (sem ?parent) ou filhas de ?parent=MLBxxx. */
  async categories(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const parent = String(req.query.parent || "").toUpperCase();
      if (parent && !/^MLB\d+$/.test(parent)) return res.status(400).json({ error: "Categoria inválida" });
      if (!parent && categoriesCache.data && Date.now() - categoriesCache.at < 24 * 60 * 60 * 1000) {
        return res.json(categoriesCache.data);
      }

      const token = await getOwnerMeliToken(ownerId);
      if (!token) return res.status(422).json({ error: "Conecte uma conta do Mercado Livre", code: "NO_ACCOUNT" });

      if (!parent) {
        const data = await mlGet("/sites/MLB/categories", token);
        categoriesCache = { at: Date.now(), data };
        return res.json(data);
      }
      const cat = await mlGet(`/categories/${parent}`, token);
      return res.json((cat.children_categories || []).map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      console.error("[SellerMonitor] categories:", err.response?.status || err.message);
      return res.status(500).json({ error: "Erro ao carregar categorias" });
    }
  },

  /** Concorrentes encontrados na varredura (marca os já monitorados). */
  async competitors(req, res) {
    try {
      const ownerId = oid(getOwnerId(req));
      const [list, monitored] = await Promise.all([
        listCompetitors(ownerId),
        SellerPage.find({ ownerId, mlSellerId: { $ne: null } }).select("mlSellerId").lean(),
      ]);
      const monitoredIds = new Set(monitored.map((m) => m.mlSellerId));
      return res.json(list.map((c) => ({ ...c, monitored: monitoredIds.has(c.sellerId) })));
    } catch (err) {
      console.error("[SellerMonitor] competitors:", err);
      return res.status(500).json({ error: "Erro ao listar concorrentes" });
    }
  },
};
