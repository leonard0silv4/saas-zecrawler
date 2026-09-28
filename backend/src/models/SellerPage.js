import mongoose from "mongoose";

const sellerPageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    name: { type: String, default: "" },
    // Vendedor ML resolvido (id direto, _CustId_ da URL ou nickname encontrado na varredura de catálogos)
    mlSellerId: { type: Number, default: null },
    nickname: { type: String, default: "" },
    // true quando o vendedor não aparece em nenhum catálogo varrido
    noData: { type: Boolean, default: false },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    active: { type: Boolean, default: true },
    scraping: { type: Boolean, default: false },
    scrapingStartedAt: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sellerPageSchema.index({ ownerId: 1, url: 1 }, { unique: true });

export default mongoose.model("SellerPage", sellerPageSchema);
