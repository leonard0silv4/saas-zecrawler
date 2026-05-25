import axios from "axios";
import mongoose from "mongoose";
import { startOfDay, subDays, eachDayOfInterval, format } from "date-fns";
import Conta from "../models/Conta.js";
import MeliOrder from "../models/MeliOrder.js";
import MeliProduct from "../models/MeliProduct.js";
import { renewToken } from "../utils/meliToken.js";
import { getOwnerId } from "../middleware/auth.js";

async function getActiveContas(ownerId) {
  return Conta.find({
    ownerId,
    access_token: { $exists: true },
    $or: [{ disabled: { $exists: false } }, { disabled: false }],
  });
}

function periodToDates(period = "30d") {
  const days = parseInt(period) || 30;
  const to = new Date();
  const from = subDays(startOfDay(to), days - 1);
  return { from, to };
}

async function syncOrdersForConta(conta, ownerId) {
  const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
  const token = await renewToken(conta);
  const headers = { Authorization: `Bearer ${token}` };

  const lastOrder = await MeliOrder.findOne(
    { ownerId: ownerObjectId, user_id: conta.user_id },
    { date_created: 1 },
    { sort: { date_created: -1 } }
  );

  const fromDate = lastOrder
    ? new Date(lastOrder.date_created.getTime() - 86400000)
    : subDays(new Date(), 90);

  let offset = 0;
  const limit = 50;
  let hasMore = true;
  const ops = [];

  while (hasMore) {
    const { data } = await axios.get("https://api.mercadolibre.com/orders/search", {
      headers,
      params: {
        seller: conta.user_id,
        sort: "date_desc",
        limit,
        offset,
        "date_created.from": fromDate.toISOString(),
      },
    });

    const results = data?.results || [];
    if (!results.length) break;

    for (const order of results) {
      const mlFee = Array.isArray(order.fee_details)
        ? order.fee_details.reduce((sum, f) => sum + (f.amount || 0), 0)
        : 0;

      const orderItems = Array.isArray(order.order_items)
        ? order.order_items.map((oi) => ({
            item_id: oi.item?.id || null,
            title: oi.item?.title || "",
            sku: oi.item?.seller_custom_field || null,
            quantity: oi.quantity || 0,
            unit_price: oi.unit_price || 0,
            logistic_type: order.shipping?.logistic_type || null,
          }))
        : [];

      ops.push({
        updateOne: {
          filter: { ownerId: ownerObjectId, order_id: order.id },
          update: {
            $set: {
              order_id: order.id,
              ownerId: ownerObjectId,
              user_id: conta.user_id,
              contaId: conta._id,
              status: order.status,
              total_amount: order.total_amount || 0,
              paid_amount: order.paid_amount || 0,
              ml_fee: mlFee,
              shipping_cost: order.shipping?.cost || 0,
              currency_id: order.currency_id || "BRL",
              date_closed: order.date_closed ? new Date(order.date_closed) : null,
              date_created: order.date_created ? new Date(order.date_created) : null,
              order_items: orderItems,
            },
          },
          upsert: true,
        },
      });
    }

    offset += limit;
    hasMore = results.length === limit && offset < 500;
  }

  if (ops.length) await MeliOrder.bulkWrite(ops, { ordered: false });
  return ops.length;
}

const MeliAnalyticsController = {
  async sync(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { user_id } = req.query;

      let contas;
      if (user_id) {
        contas = await Conta.find({
          ownerId,
          user_id: Number(user_id),
          $or: [{ disabled: { $exists: false } }, { disabled: false }],
        });
      } else {
        contas = await getActiveContas(ownerId);
      }

      if (!contas.length) return res.status(400).json({ error: "Nenhuma conta ML ativa" });

      let total = 0;
      for (const conta of contas) {
        try {
          const count = await syncOrdersForConta(conta, ownerId);
          total += count;
        } catch (err) {
          console.error(`Erro ao sincronizar pedidos da conta ${conta.user_id}:`, err.message);
        }
      }

      res.json({ synced: total });
    } catch (err) {
      console.error("analytics sync error:", err);
      res.status(500).json({ error: "Erro ao sincronizar pedidos" });
    }
  },

  async summary(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { user_id, period = "30d" } = req.query;
      const { from, to } = periodToDates(period);

      const filter = {
        ownerId: new mongoose.Types.ObjectId(ownerId),
        status: "paid",
        date_closed: { $gte: from, $lte: to },
      };
      if (user_id) filter.user_id = Number(user_id);

      const [agg] = await MeliOrder.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            faturamento: { $sum: "$total_amount" },
            taxa_ml: { $sum: "$ml_fee" },
            pedidos: { $sum: 1 },
          },
        },
      ]);

      const faturamento = agg?.faturamento || 0;
      const taxa_ml = agg?.taxa_ml || 0;
      const pedidos = agg?.pedidos || 0;
      const liq_marketplace = faturamento - taxa_ml;
      const ticket_medio = pedidos > 0 ? faturamento / pedidos : 0;

      res.json({ faturamento, taxa_ml, liq_marketplace, pedidos, ticket_medio });
    } catch (err) {
      console.error("analytics summary error:", err);
      res.status(500).json({ error: "Erro ao calcular resumo" });
    }
  },

  async salesChart(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { user_id, period = "30d" } = req.query;
      const { from, to } = periodToDates(period);

      const filter = {
        ownerId: new mongoose.Types.ObjectId(ownerId),
        status: "paid",
        date_closed: { $gte: from, $lte: to },
      };
      if (user_id) filter.user_id = Number(user_id);

      const rows = await MeliOrder.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date_closed" } },
            receita: { $sum: "$total_amount" },
            pedidos: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const byDate = Object.fromEntries(rows.map((r) => [r._id, r]));
      const days = eachDayOfInterval({ start: from, end: to });
      const data = days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        return { date: key, receita: byDate[key]?.receita || 0, pedidos: byDate[key]?.pedidos || 0 };
      });

      res.json(data);
    } catch (err) {
      console.error("analytics sales chart error:", err);
      res.status(500).json({ error: "Erro ao gerar gráfico" });
    }
  },

  async topProducts(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { user_id, period = "30d", limit = 20 } = req.query;
      const { from, to } = periodToDates(period);

      const filter = {
        ownerId: new mongoose.Types.ObjectId(ownerId),
        status: "paid",
        date_closed: { $gte: from, $lte: to },
      };
      if (user_id) filter.user_id = Number(user_id);

      const rows = await MeliOrder.aggregate([
        { $match: filter },
        { $unwind: "$order_items" },
        {
          $group: {
            _id: "$order_items.item_id",
            title: { $first: "$order_items.title" },
            sku: { $first: "$order_items.sku" },
            unidades: { $sum: "$order_items.quantity" },
            receita: { $sum: { $multiply: ["$order_items.quantity", "$order_items.unit_price"] } },
            logistic_type: { $first: "$order_items.logistic_type" },
          },
        },
        { $sort: { receita: -1 } },
        { $limit: Number(limit) },
      ]);

      res.json(rows);
    } catch (err) {
      console.error("analytics top products error:", err);
      res.status(500).json({ error: "Erro ao buscar top produtos" });
    }
  },

  async orders(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { user_id, period = "30d", page = 1, limit = 50 } = req.query;
      const { from, to } = periodToDates(period);

      const filter = {
        ownerId: new mongoose.Types.ObjectId(ownerId),
        date_closed: { $gte: from, $lte: to },
      };
      if (user_id) filter.user_id = Number(user_id);

      const skip = (Number(page) - 1) * Number(limit);
      const [orders, total] = await Promise.all([
        MeliOrder.find(filter).sort({ date_closed: -1 }).skip(skip).limit(Number(limit)).lean(),
        MeliOrder.countDocuments(filter),
      ]);

      res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (err) {
      console.error("analytics orders error:", err);
      res.status(500).json({ error: "Erro ao listar pedidos" });
    }
  },

  async inventory(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { user_id, filter: filterType } = req.query;

      const query = { ownerId: new mongoose.Types.ObjectId(ownerId) };
      if (user_id) query.user_id = Number(user_id);
      if (filterType === "full") query.isFull = true;
      if (filterType === "normal") query.isFull = { $ne: true };
      if (filterType === "ruptura") query.alertRuptura = "RUPTURA";

      const products = await MeliProduct.find(query)
        .sort({ alertRuptura: 1, available_quantity: 1 })
        .lean();

      res.json(products);
    } catch (err) {
      console.error("analytics inventory error:", err);
      res.status(500).json({ error: "Erro ao listar inventário" });
    }
  },
};

export { syncOrdersForConta };
export default MeliAnalyticsController;
