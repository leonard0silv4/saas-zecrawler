import axios from "axios";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Conta from "../models/Conta.js";
import MeliProduct from "../models/MeliProduct.js";
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

export default {
  async authRedirect(req, res) {
    try {
      const token = req.query.token;
      const decoded = jwt.verify(token, process.env.SECRET);
      const url = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${ML_REDIRECT_URI}&state=${decoded.userId}`;
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

  async getProducts(req, res) {
    try {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: "user_id é obrigatório" });

      const ownerId = new mongoose.Types.ObjectId(getOwnerId(req));
      const uid = Number(user_id);
      const contaOk = await Conta.findOne({ ownerId, user_id: uid, disabled: { $ne: true } });
      if (!contaOk) return res.status(403).json({ error: "Conta não encontrada ou sem permissão" });

      const produtos = await MeliProduct.find({ user_id: uid, ownerId });
      return res.json(produtos);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao listar produtos" });
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
