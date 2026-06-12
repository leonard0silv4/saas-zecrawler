import mongoose from "mongoose";

const meliQuestionSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    user_id: { type: Number, required: true, index: true },
    question_id: { type: Number, required: true },
    item_id: { type: String, default: null },
    item_title: { type: String, default: null },
    from_id: { type: Number, default: null },
    from_nickname: { type: String, default: null },
    text: { type: String, required: true },
    status: { type: String, enum: ["UNANSWERED", "ANSWERED"], default: "UNANSWERED", index: true },
    date_created: { type: Date, required: true },
    answer_text: { type: String, default: null },
    answer_status: { type: String, default: null },
    answer_date_created: { type: Date, default: null },
    answered_by: { type: String, enum: ["manual", "template"], default: null },
    answeredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    item_status: { type: String, default: null }, // status do anúncio no ML (active, paused, closed…)
    ml_status: { type: String, default: null },   // espelho de raw_payload.status para queries eficientes
    last_synced_at: { type: Date, default: null },
    raw_payload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

meliQuestionSchema.index({ ownerId: 1, user_id: 1, status: 1 });
meliQuestionSchema.index({ ownerId: 1, question_id: 1 }, { unique: true });
meliQuestionSchema.index({ ownerId: 1, from_id: 1 });
meliQuestionSchema.index({ ownerId: 1, user_id: 1, ml_status: 1 });

export default mongoose.model("MeliQuestion", meliQuestionSchema);
