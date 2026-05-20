import mongoose from "mongoose";
import MeliQuestion from "../models/MeliQuestion.js";
import MeliMessageTemplate from "../models/MeliMessageTemplate.js";
import { getOwnerId } from "../middleware/auth.js";
import { answerQuestion, syncQuestionsForOwner } from "../services/meliMessagesService.js";

const MAX_REPLY_LEN = 2000;

function toObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
}

function parsePage(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

export default {
  async listQuestions(req, res) {
    try {
      const ownerId = toObjectId(getOwnerId(req));
      const page = parsePage(req.query.page, 1);
      const limit = Math.min(parsePage(req.query.limit, 20), 100);
      const skip = (page - 1) * limit;
      const ML_INVALID_STATUSES = ["UNDER_REVIEW", "CLOSED_BY_ML", "DISABLED", "DELETED", "BANNED"];
      const filter = {
        ownerId,
        // Excluir perguntas cujo raw_payload indica status inválido no ML
        "raw_payload.status": { $nin: ML_INVALID_STATUSES },
      };

      if (req.query.status && ["UNANSWERED", "ANSWERED"].includes(req.query.status)) {
        filter.status = req.query.status;
      }

      if (req.query.user_id && /^\d+$/.test(String(req.query.user_id))) {
        filter.user_id = Number(req.query.user_id);
      }

      if (req.query.search) {
        const safe = String(req.query.search).trim();
        if (safe) {
          filter.$or = [
            { text: { $regex: safe, $options: "i" } },
            { item_title: { $regex: safe, $options: "i" } },
          ];
        }
      }

      const [items, total] = await Promise.all([
        MeliQuestion.find(filter).sort({ date_created: -1 }).skip(skip).limit(limit).lean(),
        MeliQuestion.countDocuments(filter),
      ]);

      return res.json({ items, page, limit, total });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao listar perguntas" });
    }
  },

  async replyQuestion(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const questionId = req.params.questionId;
      const { text, templateId } = req.body || {};

      let finalText = String(text || "").trim();
      let answeredBy = "manual";
      if (!finalText && templateId) {
        const template = await MeliMessageTemplate.findOne({
          _id: templateId,
          ownerId: toObjectId(ownerId),
          isActive: true,
        });
        if (!template) {
          return res.status(404).json({ error: "Template não encontrado" });
        }
        finalText = String(template.content || "").trim();
        answeredBy = "template";
        template.lastUsedAt = new Date();
        await template.save();
      }

      if (!finalText) {
        return res.status(400).json({ error: "Texto da resposta é obrigatório" });
      }
      if (finalText.length > MAX_REPLY_LEN) {
        return res.status(400).json({ error: `Resposta excede o limite de ${MAX_REPLY_LEN} caracteres` });
      }

      const result = await answerQuestion({ ownerId, questionId, text: finalText, answeredBy });
      return res.json({ ok: true, reply: result });
    } catch (error) {
      if (error.code === "ALREADY_ANSWERED") {
        return res.status(409).json({ error: error.message });
      }
      if (error.code === "QUESTION_NOT_ACCESSIBLE") {
        return res.status(404).json({ error: error.message });
      }
      if (error.code === "ML_API_ERROR" && error.mlStatus) {
        const status = Number(error.mlStatus);
        const safeStatus = status === 401 || status === 403 || status === 404 ? status : 502;
        return res.status(safeStatus).json({
          error: error.message,
          meliCode: error.mlBody?.code,
          hint:
            status === 403
              ? "Conecte a conta do Mercado Livre de novo em Contas conectadas e aceite as permissões de leitura e escrita. Autorizações antigas podem não permitir enviar respostas."
              : undefined,
        });
      }
      console.log(error);
      return res.status(500).json({ error: "Erro ao responder pergunta" });
    }
  },

  async listTemplates(req, res) {
    try {
      const ownerId = toObjectId(getOwnerId(req));
      const templates = await MeliMessageTemplate.find({ ownerId }).sort({ createdAt: -1 }).lean();
      return res.json(templates);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao listar templates" });
    }
  },

  async createTemplate(req, res) {
    try {
      const ownerId = toObjectId(getOwnerId(req));
      const name = String(req.body?.name || "").trim();
      const content = String(req.body?.content || "").trim();
      const isActive = req.body?.isActive !== false;

      if (!name || !content) {
        return res.status(400).json({ error: "name e content são obrigatórios" });
      }

      const created = await MeliMessageTemplate.create({ ownerId, name, content, isActive });
      return res.status(201).json(created);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: "Já existe template com este nome" });
      }
      return res.status(500).json({ error: "Erro ao criar template" });
    }
  },

  async updateTemplate(req, res) {
    try {
      const ownerId = toObjectId(getOwnerId(req));
      const { id } = req.params;
      const payload = {};

      if (req.body?.name !== undefined) payload.name = String(req.body.name || "").trim();
      if (req.body?.content !== undefined) payload.content = String(req.body.content || "").trim();
      if (req.body?.isActive !== undefined) payload.isActive = !!req.body.isActive;

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: "Nada para atualizar" });
      }

      const updated = await MeliMessageTemplate.findOneAndUpdate(
        { _id: id, ownerId },
        payload,
        { new: true }
      );

      if (!updated) return res.status(404).json({ error: "Template não encontrado" });
      return res.json(updated);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: "Já existe template com este nome" });
      }
      return res.status(500).json({ error: "Erro ao atualizar template" });
    }
  },

  async deleteTemplate(req, res) {
    try {
      const ownerId = toObjectId(getOwnerId(req));
      const { id } = req.params;
      const deleted = await MeliMessageTemplate.findOneAndDelete({ _id: id, ownerId });
      if (!deleted) return res.status(404).json({ error: "Template não encontrado" });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao remover template" });
    }
  },

  async deleteQuestion(req, res) {
    try {
      const ownerId = toObjectId(getOwnerId(req));
      const questionId = Number(req.params.questionId);
      if (!Number.isFinite(questionId)) {
        return res.status(400).json({ error: "questionId inválido" });
      }
      const deleted = await MeliQuestion.findOneAndDelete({ ownerId, question_id: questionId });
      if (!deleted) return res.status(404).json({ error: "Pergunta não encontrada" });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao excluir pergunta" });
    }
  },

  async sync(req, res) {
    try {
      const ownerId = getOwnerId(req);
      const result = await syncQuestionsForOwner(ownerId);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao sincronizar perguntas" });
    }
  },
};
