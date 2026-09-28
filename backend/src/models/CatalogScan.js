import mongoose from "mongoose";

/**
 * Snapshot das ofertas de um produto de catálogo do ML, por owner.
 * Alimenta o Monitor de Sellers (a API do ML não permite listar anúncios de outros vendedores,
 * mas permite listar todos os vendedores de um catálogo: GET /products/{id}/items).
 */
const offerSchema = new mongoose.Schema(
  {
    sellerId: { type: Number, required: true },
    nickname: { type: String, default: "" },
    itemId: { type: String, required: true },
    price: { type: Number, default: 0 },
    full: { type: Boolean, default: false },
  },
  { _id: false }
);

const catalogScanSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: String, required: true },
    name: { type: String, default: "" },
    image: { type: String, default: "" },
    winnerSellerId: { type: Number, default: null },
    // own = anúncio da conta ML conectada; link = módulo Links; category = mais vendidos
    sources: [{ type: String, enum: ["own", "link", "category"] }],
    offers: { type: [offerSchema], default: [] },
    scannedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

catalogScanSchema.index({ ownerId: 1, productId: 1 }, { unique: true });
catalogScanSchema.index({ ownerId: 1, "offers.sellerId": 1 });

export default mongoose.model("CatalogScan", catalogScanSchema);
