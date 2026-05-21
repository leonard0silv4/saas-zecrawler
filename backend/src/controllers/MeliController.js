import axios from "axios";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Conta from "../models/Conta.js";
import MeliProduct from "../models/MeliProduct.js";
import MeliQuestion from "../models/MeliQuestion.js";
import { renewToken } from "../utils/meliToken.js";
import { getOwnerId } from "../middleware/auth.js";

const { ML_CLIENT_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI } = process.env;

async function getActiveContas(ownerId) {
  return Conta.find({
    ownerId,
    access_token: { $exists: true },
    $or: [{ disabled: { $exists: false } }, { disabled: false }],
  });
}

async function fetchShipmentWithAnyAccount(shipmentId, ownerId) {
  const contas = await getActiveContas(ownerId);
  if (!contas.length) throw new Error("Nenhuma conta ML autenticada");

  for (const conta of contas) {
    try {
      const token = await renewToken(conta);
      const headers = { Authorization: `Bearer ${token}` };
      const { data: shipment } = await axios.get(
        `https://api.mercadolibre.com/shipments/${shipmentId}`, { headers }
      );
      return { shipment, headers, nickname: conta.nickname };
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) continue;
      throw err;
    }
  }
  throw new Error("Nenhuma conta autorizada para este envio");
}

async function findAuthorizedConta(ownerId, userId) {
  const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
  const uid = Number(userId);
  const conta = await Conta.findOne({ ownerId: ownerObjectId, user_id: uid, disabled: { $ne: true } });
  return { ownerObjectId, uid, conta };
}

async function fetchSellerItemIds(token, sellerId, { query = "", limit = 50, offset = 0 } = {}) {
  const params = { limit, offset };
  if (query) params.q = query;
  const { data } = await axios.get(`https://api.mercadolibre.com/users/${sellerId}/items/search`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return Array.isArray(data?.results) ? data.results : [];
}

async function fetchItemsDetails(token, itemIds) {
  if (!itemIds.length) return [];
  const details = await Promise.allSettled(
    itemIds.map((itemId) =>
      axios.get(`https://api.mercadolibre.com/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    )
  );
  return details
    .filter((entry) => entry.status === "fulfilled")
    .map((entry) => entry.value.data);
}

function mapItemToProductDoc(item, { ownerObjectId, conta }) {
  const sku = item.seller_custom_field || null;
  return {
    id: item.id,
    title: item.title || "",
    permalink: item.permalink || null,
    thumbnail: item.thumbnail || null,
    image: item.pictures?.[0]?.url || item.thumbnail || null,
    price: item.price || 0,
    available_quantity: item.available_quantity || 0,
    sold_quantity: item.sold_quantity || 0,
    status: item.status || null,
    start_time: item.start_time ? new Date(item.start_time) : null,
    listingTypeId: item.listing_type_id || null,
    SKU: sku,
    user_id: conta.user_id,
    ownerId: ownerObjectId,
    contaId: conta._id,
    nickname: conta.nickname || null,
    variations: Array.isArray(item.variations)
      ? item.variations.map((v) => ({
          id: String(v.id),
          available_quantity: v.available_quantity || 0,
          attributes: Array.isArray(v.attribute_combinations)
            ? v.attribute_combinations.map((a) => ({ name: a.name, value_name: a.value_name }))
            : [],
        }))
      : [],
  };
}

async function upsertProductsFromItems(items, context) {
  if (!items.length) return 0;
  const operations = items.map((item) => ({
    updateOne: {
      filter: { ownerId: context.ownerObjectId, id: item.id },
      update: { $set: mapItemToProductDoc(item, context) },
      upsert: true,
    },
  }));
  await MeliProduct.bulkWrite(operations, { ordered: false });
  return items.length;
}

function itemHasAvailableStock(item) {
  const n = (x) => Number(x ?? 0) || 0;
  if (n(item.available_quantity) > 0) return true;
  const vars = Array.isArray(item.variations) ? item.variations : [];
  return vars.some((v) => n(v.available_quantity) > 0);
}

/** Critérios alinhados ao GET /items/:id — só anúncio atualmente comprável. */
function isMeliItemEligibleForAnswerLink(item) {
  if (!item || typeof item !== "object") return false;
  const status = String(item.status || "").toLowerCase();
  if (status !== "active") return false;
  const sub = String(item.sub_status || "").toLowerCase();
  if (sub === "deleted" || sub === "forbidden") return false;
  if (!itemHasAvailableStock(item)) return false;
  const link = String(item.permalink || "").trim();
  return Boolean(link);
}

function itemThumbnailFromMlItem(item) {
  if (!item || typeof item !== "object") return null;
  const pic = Array.isArray(item.pictures) && item.pictures[0]?.url;
  return item.thumbnail || pic || item.secure_thumbnail || null;
}

function mapMeliApiItemToAutocompleteRow(item, userId) {
  return {
    id: item.id,
    title: item.title,
    permalink: item.permalink,
    SKU: item.seller_custom_field || null,
    user_id: userId,
    thumbnail: itemThumbnailFromMlItem(item),
  };
}

/**
 * Reconsulta GET /items/:id na API do ML (dados do cache podem estar defasados).
 * Atualiza o Mongo e devolve só itens ativos com estoque no momento da chamada.
 */
async function revalidateMeliItemsForAutocomplete(ownerObjectId, cachedDocs, { maxResults = 10 } = {}) {
  if (!Array.isArray(cachedDocs) || cachedDocs.length === 0) return [];
  const byUser = new Map();
  for (const doc of cachedDocs) {
    const uid = Number(doc.user_id);
    const id = doc.id != null ? String(doc.id) : "";
    if (!uid || !id) continue;
    if (!byUser.has(uid)) byUser.set(uid, []);
    const arr = byUser.get(uid);
    if (!arr.includes(id)) arr.push(id);
  }

  const out = [];
  const seen = new Set();

  for (const [uid, idList] of byUser) {
    if (out.length >= maxResults) break;
    try {
      const conta = await Conta.findOne({
        ownerId: ownerObjectId,
        user_id: uid,
        disabled: { $ne: true },
        access_token: { $exists: true },
      });
      if (!conta) continue;

      const token = await renewToken(conta);
      const idsToFetch = idList.slice(0, 25);
      const freshList = await fetchItemsDetails(token, idsToFetch);
      if (freshList.length) {
        await upsertProductsFromItems(freshList, { ownerObjectId, conta });
      }
      for (const item of freshList) {
        if (out.length >= maxResults) break;
        if (!isMeliItemEligibleForAnswerLink(item)) continue;
        const idKey = item.id;
        if (seen.has(idKey)) continue;
        seen.add(idKey);
        out.push(mapMeliApiItemToAutocompleteRow(item, uid));
      }
    } catch {
      /* token ou ML indisponível para esta conta */
    }
  }

  return out.slice(0, maxResults);
}

export default {
  async authRedirect(req, res) {
    try {
      const token = req.query.token;
      const decoded = jwt.verify(token, process.env.SECRET);
      const scope = encodeURIComponent("offline_access read write");
      const url = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${ML_REDIRECT_URI}&state=${decoded.userId}&scope=${scope}`;
      res.redirect(url);
    } catch (err) {
      res.status(400).send("Token inválido");
    }
  },

  async authCallback(req, res) {
    const { code, state: uid } = req.query;

    try {
      const { data } = await axios.post("https://api.mercadolibre.com/oauth/token", null, {
        params: {
          grant_type: "authorization_code",
          client_id: ML_CLIENT_ID, client_secret: ML_CLIENT_SECRET,
          code, redirect_uri: ML_REDIRECT_URI,
        },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const { data: userInfo } = await axios.get("https://api.mercadolibre.com/users/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });

      await Conta.findOneAndUpdate(
        { user_id: data.user_id },
        {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          nickname: userInfo.nickname,
          expires_at: new Date(Date.now() + data.expires_in * 1000),
          ownerId: uid,
        },
        { upsert: true, new: true }
      );

      res.send(
        `<p>Conta <strong>${userInfo.nickname}</strong> conectada com sucesso!</p><p><a href="javascript:history.back()">Voltar</a></p>`
      );
    } catch (err) {
      console.error("Erro na autenticação ML:", err.response?.data || err.message);
      res.status(500).send("Erro ao autenticar");
    }
  },

  async getAccounts(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const contas = await getActiveContas(ownerId);
      return res.json(contas);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao buscar contas" });
    }
  },

  async disconnectAccount(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
      const raw = req.params.userId;
      if (!raw || !/^\d+$/.test(String(raw))) {
        return res.status(400).json({ error: "ID da conta inválido" });
      }
      const uid = Number(raw);
      const deleted = await Conta.findOneAndDelete({ ownerId: ownerObjectId, user_id: uid });
      if (!deleted) {
        return res.status(404).json({ error: "Conta não encontrada" });
      }
      await Promise.all([
        MeliProduct.deleteMany({ ownerId: ownerObjectId, user_id: uid }),
        MeliQuestion.deleteMany({ ownerId: ownerObjectId, user_id: uid }),
      ]);
      return res.json({ ok: true, user_id: uid });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao desconectar conta" });
    }
  },

  async getProducts(req, res) {
    try {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: "user_id é obrigatório" });

      const { ownerObjectId, uid, conta } = await findAuthorizedConta(getOwnerId(req), user_id);
      if (!conta) return res.status(403).json({ error: "Conta não encontrada ou sem permissão" });

      let produtos = await MeliProduct.find({ user_id: uid, ownerId: ownerObjectId }).sort({ updatedAt: -1 });

      // Se o cache estiver vazio, sincroniza da API do ML.
      if (produtos.length === 0) {
        const token = await renewToken(conta);
        const itemIds = await fetchSellerItemIds(token, uid, { limit: 50, offset: 0 });
        const items = await fetchItemsDetails(token, itemIds);
        if (items.length > 0) {
          await upsertProductsFromItems(items, { ownerObjectId, conta });
          produtos = await MeliProduct.find({ user_id: uid, ownerId: ownerObjectId }).sort({ updatedAt: -1 });
        }
      }

      return res.json(produtos);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao listar produtos" });
    }
  },

  async autocompleteProducts(req, res) {
    try {
      const { user_id, q = "" } = req.query;
      const ownerId = getOwnerId(req);
      const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

      const query = String(q).trim();
      const mongoFilter = { ownerId: ownerObjectId };
      if (query) {
        mongoFilter.$or = [
          { title: { $regex: query, $options: "i" } },
          { SKU: { $regex: query, $options: "i" } },
          { id: { $regex: query, $options: "i" } },
        ];
      }
      if (user_id) {
        const { uid, conta } = await findAuthorizedConta(ownerId, user_id);
        if (!conta) return res.status(403).json({ error: "Conta não encontrada ou sem permissão" });
        mongoFilter.user_id = uid;
      }

      const CANDIDATE_LIMIT = 25;
      const RESULT_LIMIT = 10;

      const cacheSelect = {
        _id: 1,
        id: 1,
        title: 1,
        SKU: 1,
        permalink: 1,
        user_id: 1,
        status: 1,
        available_quantity: 1,
        variations: 1,
      };

      const cachedRaw = await MeliProduct.find(mongoFilter)
        .select(cacheSelect)
        .sort({ updatedAt: -1 })
        .limit(CANDIDATE_LIMIT)
        .lean();

      if (cachedRaw.length === 0 && !query) {
        return res.json({ source: "cache", items: [] });
      }

      if (cachedRaw.length > 0) {
        const liveFromCache = await revalidateMeliItemsForAutocomplete(ownerObjectId, cachedRaw, {
          maxResults: RESULT_LIMIT,
        });
        if (liveFromCache.length > 0) {
          return res.json({ source: "cache", items: liveFromCache });
        }
      }

      if (!query) {
        return res.json({ source: "cache", items: [] });
      }

      const contas = user_id
        ? [(await findAuthorizedConta(ownerId, user_id)).conta]
        : await getActiveContas(ownerId);
      if (!contas.length) return res.json({ source: "api", items: [] });

      const allItems = [];
      for (const conta of contas) {
        try {
          const token = await renewToken(conta);
          const itemIds = await fetchSellerItemIds(token, conta.user_id, { query, limit: 25, offset: 0 });
          if (!itemIds.length) continue;
          const detailedItems = await fetchItemsDetails(token, itemIds);
          if (!detailedItems.length) continue;
          await upsertProductsFromItems(detailedItems, { ownerObjectId, conta });
          allItems.push(
            ...detailedItems
              .filter(isMeliItemEligibleForAnswerLink)
              .map((item) => mapMeliApiItemToAutocompleteRow(item, conta.user_id))
          );
        } catch (err) {
          const status = err.response?.status;
          if (status === 401 || status === 403) continue;
          throw err;
        }
      }

      const deduped = Array.from(new Map(allItems.map((item) => [item.id, item])).values()).slice(0, RESULT_LIMIT);
      if (deduped.length > 0) return res.json({ source: "api", items: deduped });

      const refreshedRaw = await MeliProduct.find(mongoFilter)
        .select(cacheSelect)
        .sort({ updatedAt: -1 })
        .limit(CANDIDATE_LIMIT)
        .lean();

      const refreshedLive = await revalidateMeliItemsForAutocomplete(ownerObjectId, refreshedRaw, {
        maxResults: RESULT_LIMIT,
      });
      return res.json({ source: "api", items: refreshedLive });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao buscar sugestões de produtos" });
    }
  },

  /**
   * GET /meli/items/:itemId/permalink
   * Busca o permalink de um anúncio pelo ID (ex: MLB1234567890).
   * Não filtra por status/estoque — apenas localiza o link do anúncio.
   * Ordem: cache MongoDB → API ML direta (fetchItemsDetails).
   */
  async getItemPermalink(req, res) {
    const { itemId } = req.params;
    if (!itemId) return res.status(400).json({ error: "itemId é obrigatório" });

    try {
      const ownerId = getOwnerId(req);
      const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

      // 1. Tenta no cache — sem filtro de status
      const cached = await MeliProduct.findOne({ ownerId: ownerObjectId, id: itemId })
        .select("permalink")
        .lean();
      if (cached?.permalink) {
        return res.json({ permalink: cached.permalink, source: "cache" });
      }

      // 2. Busca direto na API do ML pelo ID (não keyword search)
      const contas = await getActiveContas(ownerObjectId);
      for (const conta of contas) {
        try {
          const token = await renewToken(conta);
          const details = await fetchItemsDetails(token, [itemId]);
          if (details.length > 0 && details[0]?.permalink) {
            await upsertProductsFromItems(details, { ownerObjectId, conta });
            return res.json({ permalink: details[0].permalink, source: "api" });
          }
        } catch (err) {
          const status = err.response?.status;
          if (status === 401 || status === 403) continue;
        }
      }

      return res.status(404).json({ error: "Anúncio não encontrado" });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao buscar permalink do anúncio" });
    }
  },

  async getShipment(req, res) {
    const { shipmentId } = req.params;
    if (!shipmentId || !/^\d+$/.test(shipmentId)) {
      return res.status(400).json({ error: "shipmentId inválido" });
    }

    try {
      const ownerId = getOwnerId(req);
      const { shipment, headers, nickname } = await fetchShipmentWithAnyAccount(shipmentId, ownerId);

      const orderId = shipment.order_id;
      const [orderRes, itemsRes] = await Promise.allSettled([
        orderId ? axios.get(`https://api.mercadolibre.com/orders/${orderId}`, { headers }) : null,
        axios.get(`https://api.mercadolibre.com/shipments/${shipmentId}/items`, { headers }),
      ]);

      const order = orderRes.status === "fulfilled" ? orderRes.value?.data : null;
      const shipmentItems = itemsRes.status === "fulfilled" ? itemsRes.value.data : [];

      const items = order?.order_items?.map((i) => ({
        id: i.item?.id, title: i.item?.title, sku: i.item?.seller_sku,
        quantity: i.quantity, unit_price: i.unit_price,
      })) || [];

      return res.json({
        shipment_id: shipment.id, order_id: orderId, seller_nickname: nickname,
        status: shipment.status, logistic_type: shipment.logistic_type,
        dimensions: shipment.dimensions, shipment_items: shipmentItems,
        order_items: items, date_created: shipment.date_created,
      });
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) return res.status(404).json({ error: "Envio não encontrado" });
      if (status === 401 || status === 403) return res.status(403).json({ error: "Sem acesso a este envio" });
      return res.status(500).json({ error: "Erro ao consultar envio" });
    }
  },
};
