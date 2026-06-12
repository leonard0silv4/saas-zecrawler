import axios from "axios";
import mongoose from "mongoose";
import Conta from "../models/Conta.js";
import MeliQuestion from "../models/MeliQuestion.js";
import MeliProduct from "../models/MeliProduct.js";
import { renewToken } from "../utils/meliToken.js";

const ML_API_BASE = "https://api.mercadolibre.com";
const PAGE_LIMIT = 50;
const MAX_PAGES = 10;

/** Status do ML que indicam pergunta inativa/cancelada — não devem aparecer no sistema */
const ML_INVALID_STATUSES = new Set(["UNDER_REVIEW", "CLOSED_BY_ML", "DISABLED", "DELETED", "BANNED"]);

/** Status de anúncio que tornam a pergunta dispensável (sem resposta necessária) */
const ML_INACTIVE_ITEM_STATUSES = new Set(["paused", "closed", "under_review", "inactive"]);

/**
 * Busca nicknames de até 20 compradores por chamada usando o endpoint multi-id do ML.
 * Retorna um mapa { user_id: nickname }. Em caso de erro, retorna objeto vazio (falha silenciosa).
 */
async function fetchBuyerNicknames(headers, fromIds) {
  if (!fromIds.length) return {};
  const BATCH_SIZE = 20;
  const result = {};
  for (let i = 0; i < fromIds.length; i += BATCH_SIZE) {
    const batch = fromIds.slice(i, i + BATCH_SIZE);
    try {
      const { data } = await axios.get(`${ML_API_BASE}/users`, {
        headers,
        params: { ids: batch.join(",") },
      });
      if (Array.isArray(data)) {
        for (const entry of data) {
          if (entry.code === 200 && entry.body?.id) {
            result[entry.body.id] = entry.body.nickname || null;
          }
        }
      }
    } catch {
      // falha silenciosa — nickname é opcional, não bloqueia o sync
    }
  }
  return result;
}

/**
 * Busca o status de até 20 anúncios por chamada usando o endpoint multi-id do ML.
 * Retorna um mapa { item_id: status }. Em caso de erro, retorna objeto vazio (falha silenciosa).
 */
async function fetchItemStatuses(headers, itemIds) {
  if (!itemIds.length) return {};
  const BATCH_SIZE = 20;
  const result = {};
  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batch = itemIds.slice(i, i + BATCH_SIZE);
    try {
      const { data } = await axios.get(`${ML_API_BASE}/items`, {
        headers,
        params: { ids: batch.join(",") },
      });
      if (Array.isArray(data)) {
        for (const entry of data) {
          if (entry.code === 200 && entry.body?.id) {
            result[entry.body.id] = String(entry.body.status || "").toLowerCase() || null;
          }
        }
      }
    } catch {
      // falha silenciosa — preferimos mostrar a pergunta do que bloquear o sync
    }
  }
  return result;
}

function toObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
}

export function parseQuestionIdFromResource(resource) {
  const normalized = String(resource || "").trim();
  const match = /^\/?questions\/(\d+)$/.exec(normalized);
  return match ? Number(match[1]) : null;
}

export function parseItemIdFromResource(resource) {
  const normalized = String(resource || "").trim();
  const match = /^\/?items\/(ML[A-Z]\d+)$/i.exec(normalized);
  return match ? match[1].toUpperCase() : null;
}

function normalizeQuestionResource(resource) {
  const questionId = parseQuestionIdFromResource(resource);
  return questionId ? "/questions/" + questionId : null;
}

async function getActiveContas(ownerId) {
  return Conta.find({
    ownerId: toObjectId(ownerId),
    access_token: { $exists: true },
    $or: [{ disabled: { $exists: false } }, { disabled: false }],
  });
}

/**
 * POST /answers devolve o objeto da pergunta: `text` no nível raiz é a pergunta do comprador;
 * o texto enviado pelo vendedor fica em `answer.text`. Usar `body.text` como resposta grava a pergunta em `answer_text`.
 */
export function resolveAnswerFieldsAfterPost(mlResponse, normalizedText, existingQuestionText = "") {
  const body = mlResponse && typeof mlResponse === "object" ? mlResponse : {};
  const innerQuestion = body.question && typeof body.question === "object" ? body.question : null;
  const answerObj = body.answer || innerQuestion?.answer;
  const fromAnswer =
    answerObj && typeof answerObj === "object" ? String(answerObj.text ?? "").trim() : "";

  const rootText = String(body.text ?? "").trim();
  const qText = String(existingQuestionText ?? "").trim();

  let answerText = normalizedText;
  if (fromAnswer) answerText = fromAnswer;
  else if (rootText && rootText !== qText) answerText = rootText;

  const dateRaw =
    (answerObj && answerObj.date_created) ||
    innerQuestion?.answer?.date_created ||
    new Date().toISOString();

  const resolvedStatus =
    (answerObj && answerObj.status) || innerQuestion?.answer?.status || "ACTIVE";

  return { answerText, answerDate: dateRaw, resolvedStatus };
}

export function mapQuestionPayload(question, ownerId, contaUserId, itemStatus = null, buyerNicknames = {}) {
  const answer = question.answer || null;
  const fromId = question.from?.id || null;
  return {
    ownerId: toObjectId(ownerId),
    user_id: contaUserId,
    question_id: Number(question.id),
    item_id: question.item_id || null,
    item_title: question.item_title || null,
    from_id: fromId,
    from_nickname: question.from?.nickname || (fromId ? (buyerNicknames[fromId] ?? null) : null),
    text: question.text || "",
    status: answer?.text ? "ANSWERED" : "UNANSWERED",
    ml_status: String(question.status || "").toUpperCase() || null,
    date_created: question.date_created ? new Date(question.date_created) : new Date(),
    answer_text: answer?.text || null,
    answer_status: answer?.status || null,
    answer_date_created: answer?.date_created ? new Date(answer.date_created) : null,
    item_status: itemStatus,
    raw_payload: question,
    last_synced_at: new Date(),
  };
}

export async function syncQuestionsForConta(ownerId, conta) {
  const token = await renewToken(conta);
  const headers = { Authorization: `Bearer ${token}` };

  const lastQuestion = await MeliQuestion.findOne({
    ownerId: toObjectId(ownerId),
    user_id: conta.user_id,
  }).sort({ date_created: -1 });
  const sinceDate = lastQuestion?.date_created || null;

  let offset = 0;
  let pages = 0;
  let insertedOrUpdated = 0;
  let shouldStop = false;

  while (!shouldStop && pages < MAX_PAGES) {
    const { data } = await axios.get(`${ML_API_BASE}/questions/search`, {
      headers,
      params: {
        seller_id: conta.user_id,
        limit: PAGE_LIMIT,
        offset,
        sort_fields: "date_created",
        sort_types: "DESC",
      },
    });

    const questions = Array.isArray(data?.questions) ? data.questions : [];
    if (!questions.length) break;

    // Busca status dos anúncios e nicknames dos compradores em lote
    const uniqueItemIds = [...new Set(questions.map((q) => q.item_id).filter(Boolean))];
    const uniqueFromIds = [...new Set(questions.map((q) => q.from?.id).filter(Boolean))];
    const [itemStatuses, buyerNicknames] = await Promise.all([
      fetchItemStatuses(headers, uniqueItemIds),
      fetchBuyerNicknames(headers, uniqueFromIds),
    ]);

    for (const q of questions) {
      const createdAt = q?.date_created ? new Date(q.date_created) : null;
      if (sinceDate && createdAt && createdAt <= sinceDate) {
        shouldStop = true;
      }

      // Ignorar perguntas com status inválido do ML (canceladas, sob revisão, etc.)
      if (ML_INVALID_STATUSES.has(String(q.status || "").toUpperCase())) continue;
      // Ignorar perguntas cuja resposta foi banida por moderação do ML
      if (String(q.answer?.status || "").toUpperCase() === "BANNED") continue;

      const itemStatus = q.item_id ? (itemStatuses[q.item_id] ?? null) : null;

      await MeliQuestion.updateOne(
        { ownerId: toObjectId(ownerId), question_id: Number(q.id) },
        { $set: mapQuestionPayload(q, ownerId, conta.user_id, itemStatus, buyerNicknames) },
        { upsert: true }
      );
      insertedOrUpdated += 1;
    }

    offset += PAGE_LIMIT;
    pages += 1;
    if (questions.length < PAGE_LIMIT) break;
  }

  return { user_id: conta.user_id, scannedPages: pages, syncedCount: insertedOrUpdated };
}

export async function syncQuestionsForOwner(ownerId) {
  const contas = await getActiveContas(ownerId);
  if (!contas.length) return { ownerId: String(ownerId), accounts: 0, syncedCount: 0, results: [] };

  const results = [];
  let syncedCount = 0;
  for (const conta of contas) {
    try {
      const result = await syncQuestionsForConta(ownerId, conta);
      results.push({ ok: true, ...result });
      syncedCount += result.syncedCount;
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        results.push({ ok: false, user_id: conta.user_id, error: "Conta sem autorização" });
        continue;
      }
      results.push({ ok: false, user_id: conta.user_id, error: error.message || "Erro desconhecido" });
    }
  }

  return { ownerId: String(ownerId), accounts: contas.length, syncedCount, results };
}

export async function syncQuestionsForContaUserId(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return { ok: true, ignored: true, reason: "invalid_user_id" };

  const conta = await Conta.findOne({
    user_id: uid,
    access_token: { $exists: true },
    disabled: { $ne: true },
  });

  if (!conta) return { ok: true, ignored: true, reason: "account_not_found", user_id: uid };

  const result = await syncQuestionsForConta(conta.ownerId, conta);
  return { ok: true, ownerId: String(conta.ownerId), ...result };
}

export async function syncQuestionsForItemResource(resource) {
  const itemId = parseItemIdFromResource(resource);
  if (!itemId) return { ok: true, ignored: true, reason: "invalid_item_resource" };

  const product = await MeliProduct.findOne({ id: itemId }).select("ownerId user_id contaId id").lean();
  if (!product) return { ok: true, ignored: true, reason: "item_not_found", item_id: itemId };

  const conta = await Conta.findOne({
    _id: product.contaId,
    ownerId: product.ownerId,
    access_token: { $exists: true },
    disabled: { $ne: true },
  });

  if (!conta) return { ok: true, ignored: true, reason: "item_account_not_found", item_id: itemId };

  const result = await syncQuestionsForConta(conta.ownerId, conta);
  return { ok: true, ownerId: String(conta.ownerId), item_id: itemId, ...result };
}

export async function syncQuestionsForAllActiveContas() {
  const ownerIds = await Conta.distinct("ownerId", {
    access_token: { $exists: true },
    disabled: { $ne: true },
  });

  const results = [];
  let syncedCount = 0;
  for (const ownerId of ownerIds) {
    const result = await syncQuestionsForOwner(ownerId);
    results.push(result);
    syncedCount += result.syncedCount || 0;
  }

  return { ok: true, ownerId: null, accounts: results.reduce((sum, row) => sum + (row.accounts || 0), 0), syncedCount, results };
}

export async function syncQuestionFromWebhook({ userId, resource }) {
  const uid = Number(userId);
  const normalizedResource = normalizeQuestionResource(resource);
  const questionId = parseQuestionIdFromResource(resource);

  if (!Number.isFinite(uid) || !normalizedResource || !questionId) {
    return { ok: true, ignored: true, reason: "invalid_payload" };
  }

  const conta = await Conta.findOne({
    user_id: uid,
    access_token: { $exists: true },
    disabled: { $ne: true },
  });

  if (!conta) {
    return { ok: true, ignored: true, reason: "account_not_found", user_id: uid, question_id: questionId };
  }

  const ownerId = conta.ownerId;
  const token = await renewToken(conta);
  const headers = { Authorization: `Bearer ${token}` };
  const { data: question } = await axios.get(`${ML_API_BASE}${normalizedResource}`, { headers });

  if (!question?.id) {
    return {
      ok: true,
      ignored: true,
      reason: "question_not_found",
      user_id: uid,
      question_id: questionId,
      ownerId: String(ownerId),
    };
  }

  const [itemStatuses, buyerNicknames] = await Promise.all([
    question.item_id ? fetchItemStatuses(headers, [question.item_id]) : {},
    question.from?.id ? fetchBuyerNicknames(headers, [question.from.id]) : {},
  ]);
  const itemStatus = question.item_id ? (itemStatuses[question.item_id] ?? null) : null;
  const mapped = mapQuestionPayload(question, ownerId, conta.user_id, itemStatus, buyerNicknames);

  const result = await MeliQuestion.updateOne(
    { ownerId: toObjectId(ownerId), question_id: Number(question.id) },
    { $set: mapped },
    { upsert: true }
  );

  return {
    ok: true,
    ownerId: String(ownerId),
    user_id: conta.user_id,
    question_id: Number(question.id),
    from_id: mapped.from_id,
    status: mapped.status,
    inserted: result.upsertedCount > 0,
    updated: result.modifiedCount > 0,
  };
}

export async function answerQuestion({ ownerId, questionId, text, answeredBy = "manual", answeredByUserId = null }) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) throw new Error("Texto da resposta é obrigatório");

  const ownerObjectId = toObjectId(ownerId);
  const questionNumericId = Number(questionId);

  const existingQuestion = await MeliQuestion.findOne({ ownerId: ownerObjectId, question_id: questionNumericId });
  if (existingQuestion?.status === "ANSWERED") {
    const error = new Error("Pergunta já respondida");
    error.code = "ALREADY_ANSWERED";
    throw error;
  }

  let conta = null;
  if (existingQuestion?.user_id) {
    conta = await Conta.findOne({
      ownerId: ownerObjectId,
      user_id: existingQuestion.user_id,
      disabled: { $ne: true },
    });
  }

  if (!conta) {
    const contas = await getActiveContas(ownerId);
    for (const candidate of contas) {
      try {
        const token = await renewToken(candidate);
        await axios.get(`${ML_API_BASE}/questions/${questionNumericId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        conta = candidate;
        break;
      } catch (error) {
        const status = error.response?.status;
        if (status === 401 || status === 403 || status === 404) continue;
        throw error;
      }
    }
  }

  if (!conta) {
    const error = new Error("Nenhuma conta conectada tem acesso a esta pergunta");
    error.code = "QUESTION_NOT_ACCESSIBLE";
    throw error;
  }

  const token = await renewToken(conta);
  const headers = { Authorization: `Bearer ${token}` };

  let data;
  try {
    ({ data } = await axios.post(
      `${ML_API_BASE}/answers`,
      { question_id: questionNumericId, text: normalizedText },
      { headers }
    ));
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    const msg =
      body?.message ||
      body?.error ||
      (status === 403
        ? "Mercado Livre negou permissão para responder (token sem escrita ou política da conta)."
        : "Falha ao enviar resposta ao Mercado Livre");
    const wrapped = new Error(msg);
    wrapped.code = "ML_API_ERROR";
    wrapped.mlStatus = status;
    wrapped.mlBody = body;
    throw wrapped;
  }

  const { answerText, answerDate, resolvedStatus } = resolveAnswerFieldsAfterPost(
    data,
    normalizedText,
    existingQuestion?.text
  );

  const mlBody = data && typeof data === "object" ? data : {};
  const insertInnerQ = mlBody.question && typeof mlBody.question === "object" ? mlBody.question : null;
  const insertDateRaw = insertInnerQ?.date_created || mlBody.date_created;
  const insertQuestionText = String(insertInnerQ?.text ?? mlBody.text ?? "").trim() || "";

  await MeliQuestion.updateOne(
    { ownerId: ownerObjectId, question_id: questionNumericId },
    {
      $set: {
        ownerId: ownerObjectId,
        user_id: conta.user_id,
        status: "ANSWERED",
        answer_text: answerText,
        answer_status: resolvedStatus,
        answer_date_created: new Date(answerDate),
        answered_by: answeredBy,
        answeredByUserId: answeredByUserId || null,
        last_synced_at: new Date(),
      },
      $setOnInsert: {
        date_created: insertDateRaw ? new Date(insertDateRaw) : new Date(),
        text: insertQuestionText,
      },
    },
    { upsert: true }
  );

  return {
    question_id: questionNumericId,
    user_id: conta.user_id,
    text: answerText,
    status: resolvedStatus,
    date_created: answerDate,
  };
}
