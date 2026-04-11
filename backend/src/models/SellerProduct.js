import mongoose from "mongoose";

const priceEntrySchema = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    date: { type: String, required: true },
  },
  { _id: false }
);

const sellerProductSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "SellerPage", required: true },
    url: { type: String, required: true },
    name: { type: String, default: "" },
    image: { type: String, default: "" },
    sku: { type: String, default: "" },
    currentPrice: { type: Number, default: 0 },
    priceHistory: { type: [priceEntrySchema], default: [] },
    isNew: { type: Boolean, default: false },
    priceChanged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

sellerProductSchema.index({ sellerId: 1, url: 1 }, { unique: true });

export default mongoose.model("SellerProduct", sellerProductSchema);
