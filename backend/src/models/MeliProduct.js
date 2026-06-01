import mongoose from "mongoose";

const historySellSchema = new mongoose.Schema({
  day: { type: Date, required: true },
  sellQty: { type: Number, required: true },
  sellQtyAcumulado: Number,
  shippingCost: Number,
});

const meliProductSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    SKU: String,
    title: String,
    image: String,
    price: Number,
    sale_price: { type: Number, default: null },
    available_quantity: Number,
    sold_quantity: Number,
    thumbnail: String,
    permalink: String,
    start_time: Date,
    status: String,
    estoque_full: Number,
    health: Number,
    contaId: { type: mongoose.Schema.Types.ObjectId, ref: "Conta" },
    user_id: Number,
    averageSellDay: Number,
    shippingCost: Number,
    nickname: String,
    isFull: Boolean,
    listingTypeId: String,
    alertRuptura: String,
    daysRestStock: Number,
    historySell: [historySellSchema],
    variations: [
      {
        id: String,
        attributes: [{ name: String, value_name: String }],
        available_quantity: Number,
      },
    ],
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

meliProductSchema.index({ ownerId: 1, id: 1 }, { unique: true });

export default mongoose.model("MeliProduct", meliProductSchema);
