import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { computeAccess, loadTeamPermissions } from "../utils/access.js";

/**
 * Extracts and verifies JWT from Authorization header.
 * Attaches user to req.user.
 */
export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    const user = await User.findById(decoded.userId).lean();

    if (!user) return res.status(401).json({ error: "Usuário não encontrado" });

    const ownerId = user.role === "owner" ? user._id : user.ownerId || user._id;
    let ownerUser = user;
    if (user.role !== "owner") {
      const o = await User.findById(ownerId).lean();
      if (o) ownerUser = o;
    }

    const teamPerms = await loadTeamPermissions(user);
    const { effectivePlan, allowedModules } = computeAccess(user, ownerUser, teamPerms);

    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      effectivePlan,
      allowedModules,
      permissions: user.permissions || [],
      ownerId,
      isPlanActive: user.plan === "free" || (user.planExpiresAt && user.planExpiresAt > new Date()),
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Sessão expirada" });
    }
    return res.status(401).json({ error: "Token inválido" });
  }
}

/**
 * Returns the effective ownerId for multi-tenant queries.
 * Owners use their own ID; members use their owner's ID.
 */
export function getOwnerId(req) {
  return String(req.user.role === "owner" ? req.user.id : req.user.ownerId);
}
