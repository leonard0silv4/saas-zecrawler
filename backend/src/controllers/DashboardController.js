import mongoose from "mongoose";
import Link from "../models/Link.js";
import SellerPage from "../models/SellerPage.js";
import SellerAlert from "../models/SellerAlert.js";
import MeliQuestion from "../models/MeliQuestion.js";
import { getOwnerId } from "../middleware/auth.js";

function toObjectId(id) {
  return new mongoose.Types.ObjectId(String(id));
}

export default {
  async stats(req, res) {
    try {
      const ownerIdStr = getOwnerId(req);
      const ownerId = toObjectId(ownerIdStr);
      const { allowedModules } = req.user;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // ── Links ──────────────────────────────────────────────────────────
      const [linksAgg] = await Link.aggregate([
        { $match: { ownerId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            online: { $sum: { $cond: [{ $gt: ["$nowPrice", 0] }, 1, 0] } },
            offline: { $sum: { $cond: [{ $not: [{ $gt: ["$nowPrice", 0] }] }, 1, 0] } },
            winning: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ["$nowPrice", "$myPrice"] }, { $gt: ["$myPrice", 0] }] },
                  1, 0,
                ],
              },
            },
            losing: {
              $sum: {
                $cond: [
                  { $and: [{ $lt: ["$nowPrice", "$myPrice"] }, { $gt: ["$myPrice", 0] }] },
                  1, 0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            total: 1,
            online: 1,
            offline: 1,
            winning: 1,
            losing: 1,
            competitividade: {
              $cond: [
                { $gt: [{ $add: ["$winning", "$losing"] }, 0] },
                {
                  $multiply: [
                    { $divide: ["$winning", { $add: ["$winning", "$losing"] }] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      ]);

      const links = linksAgg || { total: 0, online: 0, offline: 0, winning: 0, losing: 0, competitividade: 0 };

      // ── Sellers ────────────────────────────────────────────────────────
      let sellers = null;
      if (allowedModules.includes("sellerMonitor")) {
        const sellerPages = await SellerPage.find({ ownerId }, { _id: 1, name: 1, active: 1 }).lean();
        const sellerIds = sellerPages.map((s) => s._id);
        const activeCount = sellerPages.filter((s) => s.active).length;

        let alertsToday = 0;
        let priceChangesToday = 0;
        let stockChangesToday = 0;
        let topSellers = [];
        let alertsByDay = [];

        if (sellerIds.length > 0) {
          const todayTypeAgg = await SellerAlert.aggregate([
            { $match: { sellerId: { $in: sellerIds }, createdAt: { $gte: startOfToday } } },
            { $group: { _id: "$type", count: { $sum: 1 } } },
          ]);
          for (const row of todayTypeAgg) {
            if (row._id === "price_change") priceChangesToday = row.count;
            else if (row._id === "new_product") stockChangesToday = row.count;
          }
          alertsToday = priceChangesToday + stockChangesToday;

          const topAgg = await SellerAlert.aggregate([
            { $match: { sellerId: { $in: sellerIds }, createdAt: { $gte: startOfToday } } },
            { $group: { _id: "$sellerId", alertsToday: { $sum: 1 } } },
            { $sort: { alertsToday: -1 } },
            { $limit: 5 },
            { $lookup: { from: "sellerpages", localField: "_id", foreignField: "_id", as: "seller" } },
            { $unwind: { path: "$seller", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 0, name: { $ifNull: ["$seller.name", "Seller"] }, alertsToday: 1 } },
          ]);
          topSellers = topAgg;

          const byDayAgg = await SellerAlert.aggregate([
            { $match: { sellerId: { $in: sellerIds }, createdAt: { $gte: fifteenDaysAgo } } },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ]);
          alertsByDay = byDayAgg.map((r) => ({ date: r._id, count: r.count }));
        }

        sellers = {
          active: activeCount,
          total: sellerPages.length,
          alertsToday,
          priceChangesToday,
          stockChangesToday,
          topSellers,
          alertsByDay,
        };
      }

      // ── Messages ───────────────────────────────────────────────────────
      let messages = null;
      if (allowedModules.includes("meliMessages")) {
        const [countsAgg] = await MeliQuestion.aggregate([
          { $match: { ownerId } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              answered: { $sum: { $cond: [{ $eq: ["$status", "ANSWERED"] }, 1, 0] } },
            },
          },
        ]);

        const [avgAgg] = await MeliQuestion.aggregate([
          {
            $match: {
              ownerId,
              status: "ANSWERED",
              answer_date_created: { $ne: null },
              date_created: { $gte: sevenDaysAgo },
            },
          },
          {
            $group: {
              _id: null,
              avgMs: { $avg: { $subtract: ["$answer_date_created", "$date_created"] } },
            },
          },
        ]);

        const byHourAgg = await MeliQuestion.aggregate([
          { $match: { ownerId } },
          { $group: { _id: { $hour: "$date_created" }, count: { $sum: 1 } } },
        ]);

        const questionsByHour = Array(24).fill(0);
        let peakHour = 0;
        let peakCount = 0;
        for (const row of byHourAgg) {
          const h = row._id;
          if (h !== null && h >= 0 && h < 24) {
            questionsByHour[h] = row.count;
            if (row.count > peakCount) {
              peakCount = row.count;
              peakHour = h;
            }
          }
        }

        const topRespondedoresAgg = await MeliQuestion.aggregate([
          { $match: { ownerId, status: "ANSWERED", answeredByUserId: { $ne: null } } },
          { $group: { _id: "$answeredByUserId", answered: { $sum: 1 } } },
          { $sort: { answered: -1 } },
          { $limit: 5 },
          { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
          { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
          { $project: { _id: 0, name: { $ifNull: ["$user.name", "Usuário removido"] }, answered: 1 } },
        ]);

        const total = countsAgg?.total ?? 0;
        const answered = countsAgg?.answered ?? 0;

        messages = {
          total,
          answered,
          unanswered: total - answered,
          responseRate: total > 0 ? Math.round((answered / total) * 1000) / 10 : 0,
          avgResponseMinutes: avgAgg?.avgMs ? Math.round(avgAgg.avgMs / 60000) : 0,
          peakHour,
          questionsByHour,
          topRespondedores: topRespondedoresAgg,
        };
      }

      return res.json({ links, sellers, messages });
    } catch (err) {
      console.error("[Dashboard] stats error:", err);
      return res.status(500).json({ error: "Erro ao carregar estatísticas do dashboard" });
    }
  },
};
