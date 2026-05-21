import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../models/User.js";
import Team from "../models/Team.js";
import { MODULES } from "../../config/plans.js";

const VALID_MODULES = Object.keys(MODULES);

function toObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
}

function sanitizePermissions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((p) => VALID_MODULES.includes(p));
}

// ─── USUÁRIOS ──────────────────────────────────────────────────────────────────

export default {
  /**
   * Lista todos os sub-usuários (admin/member) vinculados ao owner.
   */
  async listUsers(req, res) {
    try {
      const ownerId = toObjectId(req.user.id);
      const users = await User.find({ ownerId, role: { $in: ["admin", "member"] } })
        .select("-password")
        .populate("teamIds", "name permissions")
        .sort({ createdAt: 1 })
        .lean();
      return res.json(users);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao listar usuários" });
    }
  },

  /**
   * Cria um novo sub-usuário para o owner.
   * Body: { name, email, password, permissions?, teamIds? }
   */
  async createUser(req, res) {
    try {
      const ownerId = toObjectId(req.user.id);
      const { name, email, password, permissions = [], teamIds = [] } = req.body || {};

      if (!name || !email || !password) {
        return res.status(400).json({ error: "name, email e password são obrigatórios" });
      }

      const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
      if (exists) return res.status(409).json({ error: "Email já cadastrado" });

      // Valida times (devem pertencer ao mesmo owner)
      const validTeamIds = await resolveTeamIds(teamIds, req.user.id);

      const hashedPassword = await bcrypt.hash(String(password), 10);
      const user = await User.create({
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        password: hashedPassword,
        role: "member",
        ownerId,
        permissions: sanitizePermissions(permissions),
        teamIds: validTeamIds,
      });

      const result = await User.findById(user._id)
        .select("-password")
        .populate("teamIds", "name permissions")
        .lean();
      return res.status(201).json(result);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: "Email já cadastrado" });
      return res.status(500).json({ error: "Erro ao criar usuário" });
    }
  },

  /**
   * Atualiza name, permissions e/ou teamIds de um sub-usuário.
   * Body: { name?, permissions?, teamIds? }
   */
  async updateUser(req, res) {
    try {
      const ownerId = toObjectId(req.user.id);
      const { id } = req.params;
      const payload = {};

      if (req.body?.name !== undefined) payload.name = String(req.body.name || "").trim();
      if (req.body?.permissions !== undefined) payload.permissions = sanitizePermissions(req.body.permissions);
      if (req.body?.teamIds !== undefined) {
        payload.teamIds = await resolveTeamIds(req.body.teamIds, req.user.id);
      }

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: "Nada para atualizar" });
      }

      const updated = await User.findOneAndUpdate(
        { _id: id, ownerId, role: { $in: ["admin", "member"] } },
        payload,
        { new: true }
      )
        .select("-password")
        .populate("teamIds", "name permissions")
        .lean();

      if (!updated) return res.status(404).json({ error: "Usuário não encontrado" });
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  },

  /**
   * Altera a senha de um sub-usuário.
   * Body: { password }
   */
  async updateUserPassword(req, res) {
    try {
      const ownerId = toObjectId(req.user.id);
      const { id } = req.params;
      const { password } = req.body || {};

      if (!password || String(password).length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }

      const hashed = await bcrypt.hash(String(password), 10);
      const updated = await User.findOneAndUpdate(
        { _id: id, ownerId, role: { $in: ["admin", "member"] } },
        { password: hashed },
        { new: true }
      ).select("-password").lean();

      if (!updated) return res.status(404).json({ error: "Usuário não encontrado" });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao alterar senha" });
    }
  },

  /**
   * Exclui um sub-usuário e remove sua referência dos times.
   */
  async deleteUser(req, res) {
    try {
      const ownerId = toObjectId(req.user.id);
      const { id } = req.params;

      const deleted = await User.findOneAndDelete({ _id: id, ownerId, role: { $in: ["admin", "member"] } });
      if (!deleted) return res.status(404).json({ error: "Usuário não encontrado" });

      // Remove o usuário de todos os times do owner
      await Team.updateMany({ ownerId }, { $pull: { members: toObjectId(id) } });

      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao excluir usuário" });
    }
  },

  // ─── TIMES ─────────────────────────────────────────────────────────────────

  /**
   * Lista todos os times do owner com contagem de membros.
   */
  async listTeams(req, res) {
    try {
      const ownerId = toObjectId(req.user.id);
      const teams = await Team.find({ ownerId }).sort({ createdAt: 1 }).lean();

      // Conta membros de cada time
      const teamIds = teams.map((t) => t._id);
      const memberCounts = await User.aggregate([
        { $match: { ownerId, teamIds: { $in: teamIds } } },
        { $unwind: "$teamIds" },
        { $match: { teamIds: { $in: teamIds } } },
        { $group: { _id: "$teamIds", count: { $sum: 1 } } },
      ]);
      const countMap = Object.fromEntries(memberCounts.map((r) => [String(r._id), r.count]));

      const result = teams.map((t) => ({
        ...t,
        memberCount: countMap[String(t._id)] || 0,
      }));
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao listar times" });
    }
  },

  /**
   * Cria um novo time.
   * Body: { name, permissions? }
   */
  async createTeam(req, res) {
    try {
      const ownerId = toObjectId(req.user.id);
      const { name, permissions = [] } = req.body || {};

      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "name é obrigatório" });
      }

      const team = await Team.create({
        ownerId,
        name: String(name).trim(),
        permissions: sanitizePermissions(permissions),
      });
      return res.status(201).json(team);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: "Já existe um time com este nome" });
      return res.status(500).json({ error: "Erro ao criar time" });
    }
  },

  /**
   * Atualiza nome e/ou permissões de um time.
   * Body: { name?, permissions? }
   */
  async updateTeam(req, res) {
    try {
      const ownerId = toObjectId(req.user.id);
      const { id } = req.params;
      const payload = {};

      if (req.body?.name !== undefined) payload.name = String(req.body.name || "").trim();
      if (req.body?.permissions !== undefined) payload.permissions = sanitizePermissions(req.body.permissions);

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: "Nada para atualizar" });
      }

      const updated = await Team.findOneAndUpdate({ _id: id, ownerId }, payload, { new: true });
      if (!updated) return res.status(404).json({ error: "Time não encontrado" });
      return res.json(updated);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: "Já existe um time com este nome" });
      return res.status(500).json({ error: "Erro ao atualizar time" });
    }
  },

  /**
   * Exclui um time e remove o teamId de todos os usuários membros.
   */
  async deleteTeam(req, res) {
    try {
      const ownerId = toObjectId(req.user.id);
      const { id } = req.params;

      const deleted = await Team.findOneAndDelete({ _id: id, ownerId });
      if (!deleted) return res.status(404).json({ error: "Time não encontrado" });

      // Remove referência do time em todos os usuários do owner
      await User.updateMany({ ownerId }, { $pull: { teamIds: toObjectId(id) } });

      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao excluir time" });
    }
  },

  /**
   * Adiciona um usuário ao time.
   * Body: { userId }
   */
  async addMember(req, res) {
    try {
      const ownerId = toObjectId(req.user.id);
      const { id: teamId } = req.params;
      const { userId } = req.body || {};

      if (!userId) return res.status(400).json({ error: "userId é obrigatório" });

      // Verifica que o time pertence ao owner
      const team = await Team.findOne({ _id: teamId, ownerId });
      if (!team) return res.status(404).json({ error: "Time não encontrado" });

      // Verifica que o usuário pertence ao owner
      const user = await User.findOne({ _id: userId, ownerId, role: { $in: ["admin", "member"] } });
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

      // Adiciona teamId ao usuário (evita duplicatas)
      await User.updateOne({ _id: userId }, { $addToSet: { teamIds: toObjectId(teamId) } });

      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao adicionar membro ao time" });
    }
  },

  /**
   * Remove um usuário do time.
   */
  async removeMember(req, res) {
    try {
      const ownerId = toObjectId(req.user.id);
      const { id: teamId, userId } = req.params;

      // Verifica que o time pertence ao owner
      const team = await Team.findOne({ _id: teamId, ownerId });
      if (!team) return res.status(404).json({ error: "Time não encontrado" });

      await User.updateOne(
        { _id: userId, ownerId },
        { $pull: { teamIds: toObjectId(teamId) } }
      );

      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao remover membro do time" });
    }
  },
};

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Valida e retorna apenas os teamIds que pertencem ao owner.
 */
async function resolveTeamIds(rawIds, ownerId) {
  if (!Array.isArray(rawIds) || !rawIds.length) return [];
  const teams = await Team.find({ _id: { $in: rawIds }, ownerId }).lean();
  return teams.map((t) => t._id);
}
