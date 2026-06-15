import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Team from "../models/Team.js";
import Link from "../models/Link.js";
import SellerPage from "../models/SellerPage.js";
import { PLANS } from "../../config/plans.js";

export default {
  /**
   * POST /api/admin/login
   * Validates ADMIN_USER / ADMIN_PASS from env and returns a short-lived admin JWT.
   */
  async login(req, res) {
    const { username, password } = req.body;

    const validUser = process.env.ADMIN_USER;
    const validPass = process.env.ADMIN_PASS;

    if (!validUser || !validPass) {
      return res.status(503).json({ error: "Painel admin não configurado no servidor" });
    }

    if (username !== validUser || password !== validPass) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign({ isAdmin: true }, process.env.SECRET, { expiresIn: "8h" });
    return res.json({ token });
  },

  /**
   * GET /api/admin/customers
   * Returns all owner accounts with aggregated usage data.
   */
  async customers(req, res) {
    try {
      const owners = await User.find({ role: "owner" })
        .select("-password -resetToken -resetTokenExpiresAt")
        .sort({ createdAt: -1 })
        .lean();

      const ownerIds = owners.map((o) => o._id);

      // Parallel aggregation across collections
      const [linkCounts, sellerCounts, userCounts, teamCounts] = await Promise.all([
        Link.aggregate([
          { $match: { ownerId: { $in: ownerIds } } },
          { $group: { _id: "$ownerId", count: { $sum: 1 } } },
        ]),
        SellerPage.aggregate([
          { $match: { ownerId: { $in: ownerIds } } },
          { $group: { _id: "$ownerId", count: { $sum: 1 } } },
        ]),
        User.aggregate([
          { $match: { ownerId: { $in: ownerIds }, role: { $ne: "owner" } } },
          { $group: { _id: "$ownerId", count: { $sum: 1 } } },
        ]),
        Team.aggregate([
          { $match: { ownerId: { $in: ownerIds } } },
          { $group: { _id: "$ownerId", count: { $sum: 1 } } },
        ]),
      ]);

      const toMap = (arr) =>
        arr.reduce((acc, { _id, count }) => {
          acc[String(_id)] = count;
          return acc;
        }, {});

      const linkMap   = toMap(linkCounts);
      const sellerMap = toMap(sellerCounts);
      const userMap   = toMap(userCounts);
      const teamMap   = toMap(teamCounts);

      const subUsers = await User.find({ ownerId: { $in: ownerIds }, role: { $ne: "owner" } })
        .select("name email role lastAccessAt ownerId")
        .sort({ lastAccessAt: -1 })
        .lean();

      const subUserMap = {};
      for (const u of subUsers) {
        const key = String(u.ownerId);
        if (!subUserMap[key]) subUserMap[key] = [];
        subUserMap[key].push({
          id: String(u._id),
          name: u.name,
          email: u.email,
          role: u.role,
          lastAccessAt: u.lastAccessAt || null,
        });
      }

      const customers = owners.map((owner) => {
        const id   = String(owner._id);
        const plan = PLANS[owner.plan] || PLANS.free;

        const isPaid = owner.plan !== "free";
        const isStripeActive =
          owner.stripeSubscriptionId &&
          ["active", "trialing"].includes(owner.stripeSubscriptionStatus);
        const isManualActive =
          !owner.stripeSubscriptionId &&
          owner.planExpiresAt &&
          owner.planExpiresAt > new Date();
        const isActive = !isPaid || isStripeActive || isManualActive;

        let subscriptionStatus = "free";
        if (isPaid) {
          subscriptionStatus = owner.stripeSubscriptionStatus || "manual";
          if (!isActive) subscriptionStatus = "expired";
        }

        return {
          id,
          name: owner.name,
          email: owner.email,
          plan: owner.plan,
          planName: plan.name,
          planPrice: plan.price,
          isActive,
          subscriptionStatus,
          hasStripe: !!owner.stripeSubscriptionId,
          planExpiresAt: owner.planExpiresAt || null,
          createdAt: owner.createdAt,
          lastAccessAt: owner.lastAccessAt || null,
          links:   { count: linkMap[id]   || 0, max: plan.maxLinks },
          sellers: { count: sellerMap[id] || 0, max: plan.maxSellerMonitors },
          users:   { count: userMap[id]   || 0, max: plan.maxTeamUsers },
          teams:   { count: teamMap[id]   || 0, max: plan.maxTeams },
          members: subUserMap[id] || [],
        };
      });

      return res.json({ customers, total: customers.length });
    } catch (err) {
      console.error("[Admin] customers error:", err);
      return res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  },

  /**
   * GET /api/admin/stats
   * Returns global platform statistics.
   */
  async stats(req, res) {
    try {
      const now       = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [total, byPlan, newThisMonth, totalLinks, totalSellers, mrrByPlan] = await Promise.all([
        User.countDocuments({ role: "owner" }),
        User.aggregate([
          { $match: { role: "owner" } },
          { $group: { _id: "$plan", count: { $sum: 1 } } },
        ]),
        User.countDocuments({ role: "owner", createdAt: { $gte: monthStart } }),
        Link.countDocuments({}),
        SellerPage.countDocuments({}),
        User.aggregate([
          {
            $match: {
              role: "owner",
              plan: { $ne: "free" },
              $or: [
                { stripeSubscriptionStatus: "active" },
                { stripeSubscriptionId: null, planExpiresAt: { $gt: now } },
              ],
            },
          },
          { $group: { _id: "$plan", count: { $sum: 1 } } },
        ]),
      ]);

      const planMap = byPlan.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {});

      const mrrMap = mrrByPlan.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {});

      const freeCount     = planMap.free     || 0;
      const starterCount  = planMap.starter  || 0;
      const proCount      = planMap.pro      || 0;
      const businessCount = planMap.business || 0;

      const subscribers = starterCount + proCount + businessCount;
      const mrr =
        (mrrMap.starter  || 0) * PLANS.starter.price  +
        (mrrMap.pro      || 0) * PLANS.pro.price       +
        (mrrMap.business || 0) * PLANS.business.price;

      return res.json({
        total,
        newThisMonth,
        subscribers,
        freeUsers: freeCount,
        mrr: mrr.toFixed(2),
        totalLinks,
        totalSellers,
        byPlan: planMap,
      });
    } catch (err) {
      console.error("[Admin] stats error:", err);
      return res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  },
};
