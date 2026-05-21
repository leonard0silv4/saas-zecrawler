import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    permissions: [{ type: String }], // módulos: links, priceAnalyze, catalog, meli, meliMessages, sellerMonitor
  },
  { timestamps: true }
);

// Nome único por owner
teamSchema.index({ ownerId: 1, name: 1 }, { unique: true });

export default mongoose.model("Team", teamSchema);
