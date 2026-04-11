import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    sku: { type: String, index: true },
    link: { type: String, required: true },
    name: String,
    status: String,
    myPrice: Number,
    nowPrice: Number,
    lastPrice: Number,
    image: String,
    seller: String,
    dateMl: Date,
    storeName: { type: String, index: true },
    ratingSeller: String,
    full: Boolean,
    catalog: Boolean,
    tags: [String],
    history: [
      {
        price: Number,
        seller: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

linkSchema.index({ ownerId: 1, storeName: 1 });
linkSchema.index({ ownerId: 1, sku: 1 });

export default mongoose.model("Link", linkSchema);
