import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    item_id: String,
    title: String,
    sku: String,
    quantity: Number,
    unit_price: Number,
    logistic_type: String,
  },
  { _id: false }
);

const meliOrderSchema = new mongoose.Schema(
  {
    order_id: { type: Number, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    user_id: { type: Number, required: true },
    contaId: { type: mongoose.Schema.Types.ObjectId, ref: "Conta" },
    status: String,
    total_amount: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    ml_fee: { type: Number, default: 0 },
    shipping_cost: { type: Number, default: 0 },
    currency_id: { type: String, default: "BRL" },
    date_closed: Date,
    date_created: Date,
    order_items: [orderItemSchema],
  },
  { timestamps: true }
);

meliOrderSchema.index({ ownerId: 1, order_id: 1 }, { unique: true });
meliOrderSchema.index({ ownerId: 1, user_id: 1, date_closed: -1 });

export default mongoose.model("MeliOrder", meliOrderSchema);
