import mongoose from "mongoose";

const priceAnalyzeSnapshotSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    xml: { type: String, required: true },
    extractionDate: { type: Date, required: true },
    rowCount: { type: Number, default: 0 },
    sourceUrlCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("PriceAnalyzeSnapshot", priceAnalyzeSnapshotSchema);
