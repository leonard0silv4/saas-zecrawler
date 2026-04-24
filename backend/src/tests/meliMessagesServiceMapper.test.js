import test from "node:test";
import assert from "node:assert/strict";
import { mapQuestionPayload, resolveAnswerFieldsAfterPost } from "../services/meliMessagesService.js";

test("mapQuestionPayload mapeia pergunta sem resposta como UNANSWERED", () => {
  const payload = mapQuestionPayload(
    {
      id: 123,
      text: "Tem garantia?",
      item_id: "MLB1",
      item_title: "Produto X",
      from: { id: 99, nickname: "comprador_1" },
      date_created: "2026-04-24T10:00:00.000Z",
    },
    "66295d5f6b9f13b2a4b70001",
    555
  );

  assert.equal(payload.question_id, 123);
  assert.equal(payload.user_id, 555);
  assert.equal(payload.status, "UNANSWERED");
  assert.equal(payload.answer_text, null);
});

test("mapQuestionPayload mapeia pergunta com resposta como ANSWERED", () => {
  const payload = mapQuestionPayload(
    {
      id: 124,
      text: "Envia hoje?",
      date_created: "2026-04-24T11:00:00.000Z",
      answer: {
        text: "Enviamos no mesmo dia.",
        status: "ACTIVE",
        date_created: "2026-04-24T11:05:00.000Z",
      },
    },
    "66295d5f6b9f13b2a4b70001",
    777
  );

  assert.equal(payload.status, "ANSWERED");
  assert.equal(payload.answer_text, "Enviamos no mesmo dia.");
  assert.equal(payload.answer_status, "ACTIVE");
});

test("resolveAnswerFieldsAfterPost usa answer.text (não o text da pergunta no raiz)", () => {
  const mlPostBody = {
    id: 3957150025,
    text: "Qual o prazo de entrega?",
    status: "ANSWERED",
    answer: {
      text: "Enviamos em até 48h úteis.",
      status: "ACTIVE",
      date_created: "2026-04-24T12:00:00.000Z",
    },
  };
  const { answerText, resolvedStatus } = resolveAnswerFieldsAfterPost(
    mlPostBody,
    "Enviamos em até 48h úteis.",
    "Qual o prazo de entrega?"
  );
  assert.equal(answerText, "Enviamos em até 48h úteis.");
  assert.equal(resolvedStatus, "ACTIVE");
});

test("resolveAnswerFieldsAfterPost ignora text raiz igual à pergunta e usa normalizedText", () => {
  const { answerText } = resolveAnswerFieldsAfterPost(
    { text: "Mesma pergunta?", answer: null },
    "Nossa resposta aqui.",
    "Mesma pergunta?"
  );
  assert.equal(answerText, "Nossa resposta aqui.");
});
