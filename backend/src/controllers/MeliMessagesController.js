import mongoose from "mongoose";
import MeliQuestion from "../models/MeliQuestion.js";
import MeliMessageTemplate from "../models/MeliMessageTemplate.js";
import { getOwnerId } from "../middleware/auth.js";
import { answerQuestion, syncQuestionFromWebhook, syncQuestionsForAllActiveContas, syncQuestionsForContaUserId, syncQuestionsForItemResource, syncQuestionsForOwner } from "../services/meliMessagesService.js";
import { emitSSE } from "../utils/sse.js";

const MAX_REPLY_LEN = 2000;
const ITEM_WEBHOOK_SYNC_COOLDOWN_MS = 30000;
const ITEM_WEBHOOK_GLOBAL_SYNC_COOLDOWN_MS = 60000;
const itemWebhookSyncByUserId = new Map();
let lastItemWebhookGlobalSyncAt = 0;
const WEBHOOK_DEBUG = process.env.ML_WEBHOOK_DEBUG === "true";

function debugWebhook(message, data) {
  if (WEBHOOK_DEBUG) console.log(message, data);
}

function toObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
}

function parsePage(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

/** Escapa caracteres especiais de regex para uso seguro em $regex */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PT_STOPWORDS = new Set([
  "o","a","os","as","um","uma","de","do","da","dos","das","em","no","na",
  "nos","nas","por","para","com","que","e","é","se","ao","me","te","eu",
  "tu","ele","ela","isso","este","esta","esse","essa","tem","ter","foi",
  "ser","ou","mas","já","não","sim","qual","quais","quando","como","onde",
  "porque","pois","mais","menos","bem","muito","vc","voce","vocês","ola",
  "olá","bom","dia","boa","tarde","noite","tudo","certo","ok","seu","sua",
  "seus","suas","meu","minha","meus","minhas","este","aquele","aquela",
]);

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\sáéíóúãõâêîôûàèìòùç]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !PT_STOPWORDS.has(w))
    .slice(0, 6);
}

function rankAndDeduplicate(docs, preferredUserId) {
  const seen = new Set();
  return docs
    .sort((a, b) => {
      const aMatch = a.user_id === preferredUserId ? 0 : 1;
      const bMatch = b.user_id === preferredUserId ? 0 : 1;
      return aMatch - bMatch;
    })
    .filter((doc) => {
      if (!doc.answer_text) return false;
      const key = doc.answer_text.trim().toLowerCase().slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export default {
  async hookMessages(req, res) {
    const payload = req.body || {};
    const configuredAppId = process.env.ML_APPLICATION_ID;

    if (configuredAppId && String(payload.application_id || "") !== String(configuredAppId)) {
      debugWebhook("[MeliMessages Webhook] ignored application_id_mismatch", {
        application_id: payload.application_id,
        expected: configuredAppId,
        topic: payload.topic,
        resource: payload.resource,
        user_id: payload.user_id,
      });
      return res.json({ ok: true, ignored: true, reason: "application_id_mismatch" });
    }

    if (payload.topic === "items") {
      const syncKey = String(payload.user_id || "");
      const lastSyncAt = itemWebhookSyncByUserId.get(syncKey) || 0;
      if (Date.now() - lastSyncAt < ITEM_WEBHOOK_SYNC_COOLDOWN_MS) {
        return res.json({ ok: true, ignored: true, reason: "item_sync_cooldown" });
      }
      itemWebhookSyncByUserId.set(syncKey, Date.now());

      try {
        let result = await syncQuestionsForContaUserId(payload.user_id);
        if (result.ignored && result.reason === "account_not_found") {
          result = await syncQuestionsForItemResource(payload.resource);
        }
        if (result.ignored && result.reason === "item_not_found") {
          if (Date.now() - lastItemWebhookGlobalSyncAt < ITEM_WEBHOOK_GLOBAL_SYNC_COOLDOWN_MS) {
            result = { ok: true, ignored: true, reason: "item_global_sync_cooldown", itemFallbackReason: result.reason };
          } else {
            lastItemWebhookGlobalSyncAt = Date.now();
            result = await syncQuestionsForAllActiveContas();
            result.fallbackScope = "all_active_accounts";
          }
        }
        debugWebhook("[MeliMessages Webhook] item fallback sync", {
          topic: payload.topic,
          resource: payload.resource,
          user_id: payload.user_id,
          application_id: payload.application_id,
          result,
        });
        if (!result.ignored && result.syncedCount > 0) {
          if (result.ownerId) {
            emitSSE(result.ownerId, "meli:question", {
              user_id: result.user_id,
              syncedCount: result.syncedCount,
              fallbackTopic: "items",
            });
          } else if (Array.isArray(result.results)) {
            for (const ownerResult of result.results) {
              if (ownerResult.ownerId && ownerResult.syncedCount > 0) {
                const accountResults = Array.isArray(ownerResult.results) ? ownerResult.results : [];
                const changedAccounts = accountResults.filter((row) => row.syncedCount > 0);
                if (changedAccounts.length) {
                  for (const accountResult of changedAccounts) {
                    emitSSE(ownerResult.ownerId, "meli:question", {
                      user_id: accountResult.user_id,
                      syncedCount: accountResult.syncedCount,
                      fallbackTopic: "items",
                      fallbackScope: "all_active_accounts",
                    });
                  }
                } else {
                  emitSSE(ownerResult.ownerId, "meli:question", {
                    syncedCount: ownerResult.syncedCount,
                    fallbackTopic: "items",
                    fallbackScope: "all_active_accounts",
                  });
                }
              }
            }
          }
        }
        return res.json(result);
      } catch (error) {
        console.error("[MeliMessages Webhook] item fallback failed", {
          resource: payload.resource,
          user_id: payload.user_id,
          error: error.message,
          status: error.response?.status,
        });
        return res.json({ ok: true, queued: false, error: "item_fallback_failed" });
      }
    }

    if (payload.topic !== "questions") {
      debugWebhook("[MeliMessages Webhook] ignored unsupported_topic", {
        topic: payload.topic,
        resource: payload.resource,
        user_id: payload.user_id,
        application_id: payload.application_id,
      });
      return res.json({ ok: true, ignored: true, reason: "unsupported_topic" });
    }

    try {
      const result = await syncQuestionFromWebhook({ userId: payload.user_id, resource: payload.resource });
      debugWebhook("[MeliMessages Webhook] processed", {
        topic: payload.topic,
        resource: payload.resource,
        user_id: payload.user_id,
        application_id: payload.application_id,
        result,
      });
      if (result.ownerId && !result.ignored) {
        emitSSE(result.ownerId, "meli:question", {
          user_id: result.user_id,
          question_id: result.question_id,
          from_id: result.from_id,
          status: result.status,
          inserted: result.inserted,
          updated: result.updated,
        });
      }
      return res.json(result);
    } catch (error) {
      console.error("[MeliMessages Webhook]", {
        topic: payload.topic,
        resource: payload.resource,
        user_id: payload.user_id,
        error: error.message,
        status: error.response?.status,
      });
      return res.json({ ok: true, queued: false, error: "webhook_processing_failed" });
    }
  },

  async listQuestions(req, res) {
    try {
      const ownerId = toObjectId(getOwnerId(req));
      const page = parsePage(req.query.page, 1);
      const limit = Math.min(parsePage(req.query.limit, 20), 100);
      const skip = (page - 1) * limit;
      const ML_INVALID_STATUSES = ["UNDER_REVIEW", "CLOSED_BY_ML", "DISABLED", "DELETED", "BANNED"];
      /** Status de anúncio que tornam a pergunta dispensável */
      const INACTIVE_ITEM_STATUSES = ["paused", "closed", "under_review", "inactive"];
      const filter = {
        ownerId,
        // Excluir perguntas com status inválido no ML (campo indexado, sem leitura do raw_payload)
        ml_status: { $nin: ML_INVALID_STATUSES },
        // Excluir perguntas de anúncios pausados/excluídos.
        // $nin com null: MongoDB retorna docs onde o campo é null ou ausente — correto para registros antigos sem item_status.
        item_status: { $nin: INACTIVE_ITEM_STATUSES },
        // Excluir perguntas cuja resposta foi banida por moderação do ML (answer_banned_by_moderations)
        answer_status: { $ne: "BANNED" },
      };

      if (req.query.status && ["UNANSWERED", "ANSWERED"].includes(req.query.status)) {
        filter.status = req.query.status;
      }

      if (req.query.user_id && /^\d+$/.test(String(req.query.user_id))) {
        filter.user_id = Number(req.query.user_id);
      }

      if (req.query.search) {
        const safe = escapeRegex(String(req.query.search).trim());
        if (safe) {
          // Busca global de mensagens (pergunta do comprador + resposta do vendedor)
          filter.$or = [
            { text: { $regex: safe, $options: "i" } },
            { answer_text: { $regex: safe, $options: "i" } },
          ];
        }
      }

      const QUESTION_FIELDS = "question_id text status date_created answer_text answer_date_created answered_by item_title item_id from_id from_nickname item_status";
      const [items, total] = await Promise.all([
        MeliQuestion.find(filter).sort({ date_created: -1 }).skip(skip).limit(limit).select(QUESTION_FIELDS).lean(),
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

      const result = await answerQuestion({ ownerId, questionId, text: finalText, answeredBy, answeredByUserId: req.user?.id || null });
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
      console.error("Erro ao responder pergunta:", error.message);
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

  async buyerThread(req, res) {
    try {
      const ownerId = toObjectId(getOwnerId(req));
      const rawFromId = req.query.from_id;
      if (!rawFromId || !/^\d+$/.test(String(rawFromId))) {
        return res.status(400).json({ error: "from_id inválido" });
      }
      const filter = { ownerId, from_id: Number(rawFromId) };
      if (req.query.user_id && /^\d+$/.test(String(req.query.user_id))) {
        filter.user_id = Number(req.query.user_id);
      }
      const items = await MeliQuestion.find(filter)
        .sort({ date_created: 1 })
        .limit(30)
        .select("question_id text status date_created answer_text answer_date_created answered_by answeredByUserId item_title item_id from_nickname")
        .populate("answeredByUserId", "name")
        .lean();
      const from_nickname = items.length > 0 ? items[0].from_nickname || null : null;
      return res.json({ items, from_nickname });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar histórico do comprador" });
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

  async unreadCount(req, res) {
    try {
      const ownerId = toObjectId(getOwnerId(req));
      const ML_INVALID_STATUSES = ["UNDER_REVIEW", "CLOSED_BY_ML", "DISABLED", "DELETED", "BANNED"];
      const INACTIVE_ITEM_STATUSES = ["paused", "closed", "under_review", "inactive"];
      const rows = await MeliQuestion.aggregate([
        {
          $match: {
            ownerId,
            status: "UNANSWERED",
            "raw_payload.status": { $nin: ML_INVALID_STATUSES },
            item_status: { $nin: INACTIVE_ITEM_STATUSES },
            answer_status: { $ne: "BANNED" },
          },
        },
        { $group: { _id: "$user_id", count: { $sum: 1 } } },
      ]);
      const perAccount = {};
      for (const row of rows) {
        perAccount[String(row._id)] = row.count;
      }
      return res.json({ perAccount });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao consultar mensagens não respondidas" });
    }
  },

  async getSuggestions(req, res) {
    try {
      const ownerId = toObjectId(getOwnerId(req));
      const rawText = String(req.query.q || "").trim();
      if (!rawText) return res.json({ suggestions: [] });

      const preferredUserId =
        req.query.user_id && /^\d+$/.test(String(req.query.user_id))
          ? Number(req.query.user_id)
          : null;

      const keywords = extractKeywords(rawText);
      if (keywords.length === 0) return res.json({ suggestions: [] });

      const regexClauses = keywords.map((kw) => ({
        text: { $regex: kw, $options: "i" },
      }));

      const rawResults = await MeliQuestion.find({
        ownerId,
        status: "ANSWERED",
        answer_text: { $exists: true, $ne: "" },
        $or: regexClauses,
      })
        .sort({ date_created: -1 })
        .limit(30)
        .select("user_id text answer_text item_title date_created")
        .lean();

      const ranked = rankAndDeduplicate(rawResults, preferredUserId);

      const suggestions = ranked.slice(0, 5).map((doc) => ({
        text: doc.answer_text,
        sourceQuestion: doc.text,
        itemTitle: doc.item_title || null,
        sameStore: preferredUserId ? doc.user_id === preferredUserId : false,
      }));

      return res.json({ suggestions });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar sugestões" });
    }
  },
};
