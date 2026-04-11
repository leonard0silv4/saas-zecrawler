import mongoose from "mongoose";

const contaSchema = new mongoose.Schema(
  {
    user_id: { type: Number, required: true, unique: true },
    nickname: String,
    access_token: String,
    refresh_token: String,
    expires_at: Date,
    disabled: { type: Boolean, default: false },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Conta", contaSchema);
