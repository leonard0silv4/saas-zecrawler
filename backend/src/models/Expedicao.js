import mongoose from "mongoose";

// --- Registro de pacote ---
const registroSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    mesaId: { type: String, required: true, enum: ["M1", "M2", "M3", "M4"], index: true },
    seller: { type: String, enum: ["mercadoLivre", "outros", null], default: null },
    dataContabilizacao: { type: Date, required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);
registroSchema.index({ dataContabilizacao: 1, seller: 1 });
registroSchema.index({ dataContabilizacao: 1, mesaId: 1 });

export const ExpedicaoRegistro = mongoose.model("ExpedicaoRegistro", registroSchema);

// --- Meta diária ---
const metaSchema = new mongoose.Schema(
  {
    data: { type: Date, required: true, index: true },
    tipoConfiguracao: { type: String, required: true, enum: ["total", "porSeller"] },
    total: { type: Number, default: null },
    porSeller: {
      mercadoLivre: { type: Number, default: null },
      outros: { type: Number, default: null },
    },
    horariosColeta: {
      mercadoLivre: { type: String, default: "11:00" },
      outros: { type: String, default: "17:30" },
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);
metaSchema.index({ data: 1, ownerId: 1 }, { unique: true });

export const ExpedicaoMeta = mongoose.model("ExpedicaoMeta", metaSchema);

// --- Dia encerrado ---
const diaEncerradoSchema = new mongoose.Schema(
  {
    data: { type: Date, required: true, index: true },
    encerradoEm: { type: Date, required: true },
    encerradoPor: { type: String, required: true },
    totalPacotes: { type: Number, required: true, default: 0 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);
diaEncerradoSchema.index({ data: 1, ownerId: 1 }, { unique: true });

export const ExpedicaoDiaEncerrado = mongoose.model("ExpedicaoDiaEncerrado", diaEncerradoSchema);
