import mongoose from "mongoose";

const MeliAiAnalysisSchema = new mongoose.Schema(
  {
    ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    user_id:     { type: Number, default: null }, // null = visão unificada
    period:      { type: String, required: true },
    analysis:    { type: String, required: true },
    generatedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

MeliAiAnalysisSchema.index({ ownerId: 1, user_id: 1, period: 1, generatedAt: -1 });

export default mongoose.model("MeliAiAnalysis", MeliAiAnalysisSchema);
