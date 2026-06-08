import axios from "axios";
import mongoose from "mongoose";
import { startOfDay, subDays, eachDayOfInterval, format } from "date-fns";
import Conta from "../models/Conta.js";
import MeliOrder from "../models/MeliOrder.js";
import MeliProduct from "../models/MeliProduct.js";
import MeliAiAnalysis from "../models/MeliAiAnalysis.js";
import MeliQuestion from "../models/MeliQuestion.js";
import SellerAlert from "../models/SellerAlert.js";
import SellerPage from "../models/SellerPage.js";
import { renewToken } from "../utils/meliToken.js";
import { getOwnerId } from "../middleware/auth.js";
import { syncProductsForConta } from "./MeliController.js";

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

/**
 * Busca a taxa ML real de cada pedido via /collections/{payment_id}.
 * O endpoint /orders/search e /orders/{id} NÃO retornam marketplace_fee para MLB.
 * A taxa é calculada como: total_amount - net_received_amount (inclui comissão + frete ML).
 * Executa em batches de 5 requisições paralelas.
 *
 * @param {Array} orders  - array dos objetos de pedido do /orders/search (com .id, .total_amount, .payments)
 * @param {Object} headers - { Authorization: 'Bearer ...' }
 * @param {number} userId  - user_id da conta (usado apenas para logging)
 * @returns {Object} feeMap - { [order_id]: ml_fee }
 */
async function fetchOrderFees(orders, headers, userId) {
  const BATCH = 5;
  const feeMap = {};

  for (let i = 0; i < orders.length; i += BATCH) {
    const batch = orders.slice(i, i + BATCH);

    const settled = await Promise.allSettled(
      batch.map((order) => {
        // Pega o primeiro pagamento aprovado do pedido
        const approvedPayment = Array.isArray(order.payments)
          ? order.payments.find((p) => p.status === "approved")
          : null;
        if (!approvedPayment) return Promise.resolve(null);
        return axios.get(
          `https://api.mercadolibre.com/collections/${approvedPayment.id}`,
          { headers }
        );
      })
    );

    for (let j = 0; j < batch.length; j++) {
      const order = batch[j];
      const result = settled[j];

      if (result.status === "fulfilled" && result.value !== null) {
        const col = result.value.data;
        const netReceived = col.net_received_amount ?? 0;
        const totalAmount = order.total_amount ?? 0;
        // Deduções ML = tudo que o ML retém (comissão + frete quando logística ML)
        feeMap[order.id] = Math.max(0, totalAmount - netReceived);
      } else {
        if (result.status === "rejected") {
          const status = result.reason?.response?.status;
          console.warn(
            `[Analytics] Falha ao buscar collection order=${order.id} conta=${userId}${status ? ` HTTP ${status}` : ""}: ${result.reason?.message}`
          );
        }
        feeMap[order.id] = 0;
      }
    }
  }

  return feeMap;
}

async function _doSync(conta, ownerId, { forceFrom = false } = {}) {
  const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
  const token = await renewToken(conta);
  const headers = { Authorization: `Bearer ${token}` };

  let fromDate;
  if (forceFrom) {
    // Sync completo: re-processa 90 dias para corrigir fees e dados desatualizados
    fromDate = subDays(new Date(), 90);
  } else {
    const lastOrder = await MeliOrder.findOne(
      { ownerId: ownerObjectId, user_id: conta.user_id },
      { date_created: 1 },
      { sort: { date_created: -1 } }
    );
    fromDate = lastOrder
      ? new Date(lastOrder.date_created.getTime() - 86400000)
      : subDays(new Date(), 90);
  }

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

    // Busca taxa ML via /collections/{payment_id} (único endpoint que retorna net_received_amount)
    const feeMap = await fetchOrderFees(results, headers, conta.user_id);

    for (const order of results) {
      const mlFee = feeMap[order.id] ?? 0;

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

async function syncOrdersForConta(conta, ownerId, { forceFrom = false } = {}) {
  try {
    const count = await _doSync(conta, ownerId, { forceFrom });
    // Sucesso: limpar authError caso estivesse setado
    if (conta.authError) {
      await Conta.findByIdAndUpdate(conta._id, { authError: null });
    }
    return count;
  } catch (err) {
    if (err.response?.status !== 403) throw err; // outros erros sobem normalmente

    // 403: logar o body exato que o ML retornou para diagnóstico
    console.error(
      `[Analytics] 403 ML body conta=${conta.user_id}:`,
      JSON.stringify(err.response?.data ?? "(sem body)")
    );

    // forçar refresh do token e tentar uma vez mais
    console.warn(`[Analytics] 403 conta=${conta.user_id} — forçando refresh de token e retentando`);
    try {
      await renewToken(conta, { force: true });
    } catch (refreshErr) {
      await Conta.findByIdAndUpdate(conta._id, { authError: "forbidden" });
      console.error(`[Analytics] Falha ao renovar token conta=${conta.user_id}: ${refreshErr.message}`);
      return 0;
    }

    try {
      const count = await _doSync(conta, ownerId, { forceFrom });
      if (conta.authError) {
        await Conta.findByIdAndUpdate(conta._id, { authError: null });
      }
      return count;
    } catch (retryErr) {
      if (retryErr.response?.status === 403) {
        await Conta.findByIdAndUpdate(conta._id, { authError: "forbidden" });
        console.error(
          `[Analytics] Conta ${conta.user_id} retorna 403 mesmo após refresh — precisa reconectar. ML body:`,
          JSON.stringify(retryErr.response?.data ?? "(sem body)")
        );
        return 0;
      }
      throw retryErr;
    }
  }
}

const MeliAnalyticsController = {
  async sync(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { user_id, force } = req.query;
      const forceFrom = force === "true"; // re-sync completo de 90 dias quando true

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
          const count = await syncOrdersForConta(conta, ownerId, { forceFrom });
          total += count;
          // Sincronizar todos os produtos (anúncios) do vendedor
          await syncProductsForConta(conta, ownerId);
        } catch (err) {
          console.error(`Erro ao sincronizar conta ${conta.user_id}:`, err.message);
        }
      }

      res.json({ synced: total, forceFrom, accounts: contas.length });
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
      const { user_id, period = "30d", limit = 20, sortBy = "receita", onlyActive } = req.query;
      const { from, to } = periodToDates(period);

      const filter = {
        ownerId: new mongoose.Types.ObjectId(ownerId),
        status: "paid",
        date_closed: { $gte: from, $lte: to },
      };
      if (user_id) filter.user_id = Number(user_id);

      const sortStage = sortBy === "unidades" ? { unidades: -1 } : { receita: -1 };

      // Pipeline base: agrupa, ordena, busca dados do produto
      const pipeline = [
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
            ownerId: { $first: "$ownerId" },
          },
        },
        { $sort: sortStage },
        // Lookup de status do produto (thumbnail, permalink, status)
        {
          $lookup: {
            from: "meliproducts",
            let: { item_id: "$_id", owner_id: "$ownerId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$id", "$$item_id"] },
                      { $eq: ["$ownerId", "$$owner_id"] },
                    ],
                  },
                },
              },
              { $project: { thumbnail: 1, permalink: 1, status: 1, _id: 0 } },
              { $limit: 1 },
            ],
            as: "productInfo",
          },
        },
        {
          $addFields: {
            thumbnail: { $arrayElemAt: ["$productInfo.thumbnail", 0] },
            permalink: { $arrayElemAt: ["$productInfo.permalink", 0] },
            productStatus: { $arrayElemAt: ["$productInfo.status", 0] },
          },
        },
      ];

      // Filtro opcional: somente produtos com status "active" no cache
      if (onlyActive === "true") {
        pipeline.push({ $match: { productStatus: "active" } });
      }

      // Limit sempre depois do filtro para garantir top N do conjunto filtrado
      pipeline.push({ $limit: Number(limit) });
      pipeline.push({ $project: { productInfo: 0, ownerId: 0 } });

      const rows = await MeliOrder.aggregate(pipeline);

      res.json(rows);
    } catch (err) {
      console.error("analytics top products error:", err);
      res.status(500).json({ error: "Erro ao buscar top produtos" });
    }
  },

  async orders(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { user_id, period = "30d", page = 1, limit = 50, all } = req.query;
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
      const { user_id, filter: filterType, sortBy, sortDir = "desc", limit = 1000 } = req.query;

      const query = { ownerId: new mongoose.Types.ObjectId(ownerId) };
      if (user_id) query.user_id = Number(user_id);
      if (filterType === "full") query.isFull = true;
      if (filterType === "normal") query.isFull = { $ne: true };
      if (filterType === "ruptura") query.alertRuptura = "RUPTURA";
      if (filterType === "critico") query.alertRuptura = "CRÍTICO";

      // Sem sortBy → ordem natural (sem sort explícito)
      let sort = {};
      if (sortBy) {
        const d = sortDir === "asc" ? 1 : -1;
        const sortMap = {
          sold:     { sold_quantity: d },
          velocity: { averageSellDay: d },
          stock:    { alertRuptura: d, available_quantity: d },
          price:    { price: d },
        };
        sort = sortMap[sortBy] ?? {};
      }

      const products = await MeliProduct.find(query).sort(sort).limit(Number(limit)).lean();

      res.json(products);
    } catch (err) {
      console.error("analytics inventory error:", err);
      res.status(500).json({ error: "Erro ao listar inventário" });
    }
  },

  async aiAnalysis(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { user_id, period = "30d" } = req.query;
      const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
      const userIdNum = user_id ? Number(user_id) : null;

      // Verifica cache do dia
      const todayStart = startOfDay(new Date());
      const cached = await MeliAiAnalysis.findOne({
        ownerId: ownerObjectId,
        user_id: userIdNum,
        period,
        generatedAt: { $gte: todayStart },
      }).sort({ generatedAt: -1 }).lean();

      if (cached) {
        return res.json({ analysis: cached.analysis, generatedAt: cached.generatedAt, cached: true });
      }

      if (req.method === "GET") {
        return res.json({ analysis: null, cached: false });
      }

      // Datas do período atual e anterior
      const days = parseInt(period) || 30;
      const { from, to } = periodToDates(period);
      const prevFrom = subDays(from, days);
      const prevTo   = subDays(to, days);

      const orderFilter = {
        ownerId: ownerObjectId,
        status: "paid",
        date_closed: { $gte: from, $lte: to },
      };
      if (userIdNum) orderFilter.user_id = userIdNum;

      const prevOrderFilter = {
        ownerId: ownerObjectId,
        status: "paid",
        date_closed: { $gte: prevFrom, $lte: prevTo },
      };
      if (userIdNum) prevOrderFilter.user_id = userIdNum;

      const productFilter = { ownerId: ownerObjectId };
      if (userIdNum) productFilter.user_id = userIdNum;

      const QUESTION_INVALID_STATUSES = ["UNDER_REVIEW", "CLOSED_BY_ML", "DISABLED", "DELETED", "BANNED"];
      const questionFilter = {
        ownerId: ownerObjectId,
        date_created: { $gte: from },
        "raw_payload.status": { $nin: QUESTION_INVALID_STATUSES },
        answer_status: { $ne: "BANNED" },
      };
      if (userIdNum) questionFilter.user_id = userIdNum;

      // Busca lojas monitoradas para filtrar alertas de concorrentes
      const monitoredSellers = await SellerPage.find({ ownerId, active: true }, { _id: 1 }).lean();
      const sellerIds = monitoredSellers.map((s) => s._id);

      const [
        summaryAgg, prevSummaryAgg, top5, stockAlerts, adHealth,
        questionStats, topQuestioned, competitorAlerts,
        salesByDayOfWeek, salesByHour, questionsByDayOfWeek, questionsByHour,
      ] = await Promise.all([
        // KPIs período atual
        MeliOrder.aggregate([
          { $match: orderFilter },
          { $group: { _id: null, faturamento: { $sum: "$total_amount" }, taxa_ml: { $sum: "$ml_fee" }, pedidos: { $sum: 1 } } },
        ]),
        // KPIs período anterior (para tendência)
        MeliOrder.aggregate([
          { $match: prevOrderFilter },
          { $group: { _id: null, faturamento: { $sum: "$total_amount" }, pedidos: { $sum: 1 } } },
        ]),
        // Top 5 produtos por receita
        MeliOrder.aggregate([
          { $match: orderFilter },
          { $unwind: "$order_items" },
          { $group: { _id: "$order_items.item_id", nome: { $first: "$order_items.title" }, unidades: { $sum: "$order_items.quantity" }, receita: { $sum: { $multiply: ["$order_items.quantity", "$order_items.unit_price"] } } } },
          { $sort: { receita: -1 } },
          { $limit: 5 },
          { $project: { _id: 0, nome: 1, receita: 1, unidades: 1 } },
        ]),
        // Alertas de estoque
        MeliProduct.aggregate([
          { $match: productFilter },
          { $group: { _id: "$alertRuptura", count: { $sum: 1 } } },
        ]),
        // Saúde dos anúncios por status
        MeliProduct.aggregate([
          { $match: productFilter },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        // Total e não respondidas de perguntas
        MeliQuestion.aggregate([
          { $match: questionFilter },
          { $group: { _id: null, total: { $sum: 1 }, sem_resposta: { $sum: { $cond: [{ $eq: ["$status", "UNANSWERED"] }, 1, 0] } } } },
        ]),
        // Top 2 produtos com mais perguntas
        MeliQuestion.aggregate([
          { $match: questionFilter },
          { $group: { _id: "$item_id", nome: { $first: "$item_title" }, total: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: 2 },
          { $project: { _id: 0, nome: 1, total: 1 } },
        ]),
        // Alertas de concorrentes nos últimos 7 dias
        sellerIds.length > 0
          ? SellerAlert.aggregate([
              { $match: { sellerId: { $in: sellerIds }, createdAt: { $gte: subDays(new Date(), 7) } } },
              { $group: { _id: "$type", count: { $sum: 1 } } },
            ])
          : Promise.resolve([]),
        // Vendas por dia da semana (horário de Brasília)
        MeliOrder.aggregate([
          { $match: orderFilter },
          { $group: { _id: { $dayOfWeek: { date: "$date_closed", timezone: "America/Sao_Paulo" } }, vendas: { $sum: 1 } } },
          { $sort: { vendas: -1 } },
        ]),
        // Top 3 horas de pico de vendas (horário de Brasília)
        MeliOrder.aggregate([
          { $match: orderFilter },
          { $group: { _id: { $hour: { date: "$date_closed", timezone: "America/Sao_Paulo" } }, vendas: { $sum: 1 } } },
          { $sort: { vendas: -1 } },
          { $limit: 3 },
        ]),
        // Perguntas por dia da semana (horário de Brasília)
        MeliQuestion.aggregate([
          { $match: questionFilter },
          { $group: { _id: { $dayOfWeek: { date: "$date_created", timezone: "America/Sao_Paulo" } }, perguntas: { $sum: 1 } } },
          { $sort: { perguntas: -1 } },
        ]),
        // Top 3 horas de pico de perguntas (horário de Brasília)
        MeliQuestion.aggregate([
          { $match: questionFilter },
          { $group: { _id: { $hour: { date: "$date_created", timezone: "America/Sao_Paulo" } }, perguntas: { $sum: 1 } } },
          { $sort: { perguntas: -1 } },
          { $limit: 3 },
        ]),
      ]);

      // Calcula métricas financeiras
      const s = summaryAgg[0] || {};
      const faturamento = s.faturamento || 0;
      const taxa_ml     = s.taxa_ml || 0;
      const pedidos     = s.pedidos || 0;
      const liq         = faturamento - taxa_ml;
      const ticket_medio = pedidos > 0 ? faturamento / pedidos : 0;
      const taxa_ml_pct  = faturamento > 0 ? (taxa_ml / faturamento) * 100 : 0;

      const prev = prevSummaryAgg[0] || {};
      const fatPct = prev.faturamento > 0 ? ((faturamento - prev.faturamento) / prev.faturamento) * 100 : null;
      const pedPct = prev.pedidos    > 0 ? ((pedidos    - prev.pedidos)    / prev.pedidos)    * 100 : null;

      const alertMap = Object.fromEntries(stockAlerts.map((a) => [a._id, a.count]));
      const adMap    = Object.fromEntries(adHealth.map((a) => [a._id, a.count]));

      const q = questionStats[0] || { total: 0, sem_resposta: 0 };
      const taxaResposta = q.total > 0 ? ((q.total - q.sem_resposta) / q.total) * 100 : 100;

      const competitorMap = Object.fromEntries(competitorAlerts.map((a) => [a._id, a.count]));

      // Processa horários de pico (1=Dom, 2=Seg, ..., 7=Sáb)
      const DAY_NAMES = ["", "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const topSalesDays = salesByDayOfWeek.slice(0, 3).map((d) => DAY_NAMES[d._id]).filter(Boolean);
      const topSalesHours = salesByHour.map((d) => `${d._id}h`);
      const topQDays = questionsByDayOfWeek.slice(0, 3).map((d) => DAY_NAMES[d._id]).filter(Boolean);
      const topQHours = questionsByHour.map((d) => `${d._id}h`);
      const hasHorarios = topSalesDays.length > 0 || topQDays.length > 0;

      // Monta payload compacto
      const payload = {
        periodo: period,
        metricas: {
          faturamento: Math.round(faturamento * 100) / 100,
          liquido_marketplace: Math.round(liq * 100) / 100,
          pedidos,
          ticket_medio: Math.round(ticket_medio * 100) / 100,
          taxa_ml_pct: Math.round(taxa_ml_pct * 10) / 10,
          ...(fatPct !== null && { vs_periodo_anterior: {
            faturamento_pct: Math.round(fatPct * 10) / 10,
            pedidos_pct: pedPct !== null ? Math.round(pedPct * 10) / 10 : null,
          }}),
        },
        top5_produtos: top5.map((p) => ({
          nome: p.nome,
          receita: Math.round(p.receita * 100) / 100,
          unidades: p.unidades,
        })),
        estoque: {
          em_ruptura: alertMap["RUPTURA"] || 0,
          nivel_critico: alertMap["CRÍTICO"] || 0,
          nivel_baixo: alertMap["BAIXO"] || 0,
        },
        anuncios: {
          ativos: adMap["active"] || 0,
          pausados: adMap["paused"] || 0,
          encerrados: adMap["closed"] || 0,
        },
        ...(q.total > 0 && {
          perguntas: {
            total: q.total,
            sem_resposta: q.sem_resposta,
            taxa_resposta_pct: Math.round(taxaResposta * 10) / 10,
            mais_perguntados: topQuestioned.map((p) => ({ produto: p.nome, perguntas: p.total })),
          },
        }),
        ...(sellerIds.length > 0 && {
          concorrentes: {
            lojas_monitoradas: sellerIds.length,
            alertas_7d: {
              mudancas_preco: competitorMap["price_change"] || 0,
              novos_produtos: competitorMap["new_product"] || 0,
            },
          },
        }),
        ...(hasHorarios && {
          horarios: {
            vendas: { dias_pico: topSalesDays, horas_pico: topSalesHours },
            perguntas: { dias_pico: topQDays, horas_pico: topQHours },
          },
        }),
      };

      const systemPrompt = `Você é um analista sênior de e-commerce especializado em Mercado Livre Brasil.
Analise os dados abaixo e gere exatamente 6 insights — um de cada eixo:
1) Financeiro (receita, margem, tendência vs período anterior)
2) Produtos (top sellers, concentração de receita, oportunidades)
3) Operacional (estoque, anúncios pausados/encerrados)
4) Atendimento (perguntas sem resposta, produtos mais questionados)
5) Competitivo (alertas de concorrentes se disponível; caso ausente, use oportunidade de crescimento)
6) Horários (dias e horas de pico de vendas e perguntas; recomende quando o vendedor deve estar disponível para atender)

Regras:
- Cite valores exatos do input. Não invente dados.
- Cada insight: 1 frase de diagnóstico + 1 ação concreta. Máximo 3 linhas por insight.
- Formato: "• [Eixo] diagnóstico → ação"
- Sempre gere os 6 eixos mesmo que algum dado esteja ausente.
- Responda em português do Brasil.`;

      const { data: openaiRes } = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          max_tokens: 1100,
          temperature: 0.4,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(payload) },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.API_GPT_IA}`,
            "Content-Type": "application/json",
          },
        }
      );

      const analysis = openaiRes.choices?.[0]?.message?.content?.trim() || "";
      const generatedAt = new Date();

      await MeliAiAnalysis.create({ ownerId: ownerObjectId, user_id: userIdNum, period, analysis, generatedAt });

      res.json({ analysis, generatedAt, cached: false });
    } catch (err) {
      console.error("analytics ai-analysis error:", err.response?.data || err.message);
      res.status(500).json({ error: "Erro ao gerar análise com IA" });
    }
  },
};

export { syncOrdersForConta };
export default MeliAnalyticsController;
