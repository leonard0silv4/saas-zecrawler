import mongoose from "mongoose";

/** Estado e configuração da varredura de catálogos de cada owner (Monitor de Sellers). */
const catalogScanStateSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    // Categorias ML cujos mais vendidos entram na varredura
    categories: {
      type: [{ _id: false, id: { type: String, required: true }, name: { type: String, default: "" } }],
      default: [],
    },
    running: { type: Boolean, default: false },
    startedAt: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
    catalogCount: { type: Number, default: 0 },
    sellerCount: { type: Number, default: 0 },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("CatalogScanState", catalogScanStateSchema);
