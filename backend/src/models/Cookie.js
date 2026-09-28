// Legado: cookies do ML não são mais usados (coleta via API oficial desde set/2026).
// Mantido apenas para a exclusão em cascata de contas e o script purgeLegacyCookies.
import mongoose from "mongoose";

const cookieSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    value: { type: String, required: true },
    domain: { type: String, default: "" },
    path: { type: String, default: "/" },
    expiry: Number,
    httpOnly: { type: Boolean, default: false },
    secure: { type: Boolean, default: false },
    sameSite: { type: String, enum: ["Strict", "Lax", "None", null], default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Cookie", cookieSchema);
