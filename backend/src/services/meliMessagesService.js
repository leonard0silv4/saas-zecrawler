import axios from "axios";
import mongoose from "mongoose";
import Conta from "../models/Conta.js";
import MeliQuestion from "../models/MeliQuestion.js";
import { renewToken } from "../utils/meliToken.js";

const ML_API_BASE = "https://api.mercadolibre.com";
const PAGE_LIMIT = 50;
const MAX_PAGES = 10;

function toObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
}

async function getActiveContas(ownerId) {
  return Conta.find({
    ownerId: toObjectId(ownerId),
    access_token: { $exists: true },
    $or: [{ disabled: { $exists: false } }, { disabled: false }],
  });
}

export function mapQuestionPayload(question, ownerId, contaUserId) {
  const answer = question.answer || null;
  return {
    ownerId: toObjectId(ownerId),
    user_id: contaUserId,
    question_id: Number(question.id),
    item_id: question.item_id || null,
    item_title: question.item_title || null,
    from_id: question.from?.id || null,
    from_nickname: question.from?.nickname || null,
    text: question.text || "",
    status: answer?.text ? "ANSWERED" : "UNANSWERED",
    date_created: question.date_created ? new Date(question.date_created) : new Date(),
    answer_text: answer?.text || null,
    answer_status: answer?.status || null,
    answer_date_created: answer?.date_created ? new Date(answer.date_created) : null,
    raw_payload: question,
    last_synced_at: new Date(),
  };
}

async function syncQuestionsForConta(ownerId, conta) {
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

    for (const q of questions) {
      const createdAt = q?.date_created ? new Date(q.date_created) : null;
      if (sinceDate && createdAt && createdAt <= sinceDate) {
        shouldStop = true;
      }

      await MeliQuestion.updateOne(
        { ownerId: toObjectId(ownerId), question_id: Number(q.id) },
        { $set: mapQuestionPayload(q, ownerId, conta.user_id) },
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

export async function answerQuestion({ ownerId, questionId, text, answeredBy = "manual" }) {
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

  const { data } = await axios.post(
    `${ML_API_BASE}/answers`,
    { question_id: questionNumericId, text: normalizedText },
    { headers }
  );

  const answerPayload = data || {};
  const questionPayload = answerPayload.question || null;
  const answerDate = answerPayload.date_created || questionPayload?.answer?.date_created || new Date().toISOString();
  const resolvedStatus = answerPayload.status || questionPayload?.answer?.status || "ANSWERED";
  const answerText = answerPayload.text || normalizedText;

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
        last_synced_at: new Date(),
      },
      $setOnInsert: {
        date_created: questionPayload?.date_created ? new Date(questionPayload.date_created) : new Date(),
        text: questionPayload?.text || "",
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
