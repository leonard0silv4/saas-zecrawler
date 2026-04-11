import User from "../models/User.js";
import { getOwnerId } from "../middleware/auth.js";

export default {
  async show(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const owner = await User.findById(ownerId).lean();
      if (!owner) return res.status(404).json({ error: "Conta não encontrada" });
      return res.json({ mySellerNames: owner.mySellerNames || [] });
    } catch (err) {
      console.error("[Settings] show:", err);
      return res.status(500).json({ error: "Erro ao carregar configurações" });
    }
  },

  async update(req, res) {
    try {
      if (!["owner", "admin"].includes(req.user.role)) {
        return res.status(403).json({ error: "Sem permissão para alterar configurações da conta" });
      }

      const { mySellerNames } = req.body;
      if (!Array.isArray(mySellerNames)) {
        return res.status(400).json({ error: "mySellerNames deve ser um array de strings" });
      }

      const normalized = [
        ...new Set(mySellerNames.map((s) => String(s).trim()).filter(Boolean)),
      ];

      const ownerId = getOwnerId(req);
      await User.findByIdAndUpdate(ownerId, { mySellerNames: normalized });

      return res.json({ ok: true, mySellerNames: normalized });
    } catch (err) {
      console.error("[Settings] update:", err);
      return res.status(500).json({ error: "Erro ao salvar configurações" });
    }
  },
};
