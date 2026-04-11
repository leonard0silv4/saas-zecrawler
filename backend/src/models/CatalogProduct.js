import mongoose from "mongoose";

const catalogProductSchema = new mongoose.Schema(
  {
    sku1: { type: String, required: true, index: true },
    sku2: { type: String, default: "" },
    sku3: { type: String, default: "" },
    produto: { type: String, required: true },
    medidas: { type: String, required: true },
    largura: { type: Number, required: true },
    comprimento: { type: Number, required: true },
    altura: { type: Number, required: true },
    peso: { type: Number, default: 0 },
    pesoCubico: { type: Number, default: 0 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

catalogProductSchema.index({ sku1: 1, ownerId: 1 }, { unique: true });

// Auto-calc peso cúbico
catalogProductSchema.pre("save", function (next) {
  const { largura, comprimento, altura } = this;
  this.pesoCubico =
    largura > 0 && comprimento > 0 && altura > 0
      ? Math.round(((largura * comprimento * altura) / 6000) * 1000) / 1000
      : 0;
  next();
});

export default mongoose.model("CatalogProduct", catalogProductSchema);
