import mongoose from "mongoose";

const meliMessageTemplateSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

meliMessageTemplateSchema.index({ ownerId: 1, name: 1 }, { unique: true });

export default mongoose.model("MeliMessageTemplate", meliMessageTemplateSchema);
