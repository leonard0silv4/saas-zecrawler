import mongoose from "mongoose";
import Cookie from "../models/Cookie.js";
import { getOwnerId } from "../middleware/auth.js";

function mapSameSite(sameSite) {
  if (sameSite == null || sameSite === "") return null;
  const s = String(sameSite).toLowerCase();
  if (s === "no_restriction" || s === "none") return "None";
  if (s === "lax") return "Lax";
  if (s === "strict") return "Strict";
  return null;
}

export default {
  async update(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const { cookies } = req.body;

      if (!Array.isArray(cookies) || !cookies.length) {
        return res.status(400).json({ error: "cookies deve ser um array não vazio" });
      }

      const converted = cookies
        .map((c) => ({
          name: c.name != null ? String(c.name) : "",
          value: c.value != null ? String(c.value) : "",
          domain: c.domain != null ? String(c.domain) : "",
          path: c.path != null ? String(c.path) : "/",
          httpOnly: Boolean(c.httpOnly),
          secure: Boolean(c.secure),
          sameSite: mapSameSite(c.sameSite),
          ...(c.expirationDate ? { expiry: Math.floor(Number(c.expirationDate)) } : {}),
          ownerId,
        }))
        .filter((c) => c.name && c.value.trim());

      await Cookie.deleteMany({ ownerId });
      const inserted = await Cookie.insertMany(converted);

      return res.json({ ok: true, inserted: inserted.length, skipped: cookies.length - converted.length });
    } catch (err) {
      console.error("[Cookies] update error:", err);
      return res.status(500).json({ error: "Erro ao atualizar cookies" });
    }
  },

  async index(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const cookies = await Cookie.find({ ownerId }).lean();
      return res.json(cookies);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao buscar cookies" });
    }
  },

  async destroy(req, res) {
    try {
      const ownerId = getOwnerId(req);
      await Cookie.deleteMany({ ownerId });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao limpar cookies" });
    }
  },

  async status(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const exists = await Cookie.exists({ ownerId: new mongoose.Types.ObjectId(String(ownerId)) });
      return res.json({ hasCookies: exists !== null });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao verificar cookies" });
    }
  },
};
