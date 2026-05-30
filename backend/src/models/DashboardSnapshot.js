import mongoose from "mongoose";

const DashboardSnapshotSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    links: {
      total: { type: Number, default: 0 },
      winning: { type: Number, default: 0 },
      losing: { type: Number, default: 0 },
      online: { type: Number, default: 0 },
      offline: { type: Number, default: 0 },
    },
    messages: {
      total: { type: Number, default: 0 },
      answered: { type: Number, default: 0 },
      unanswered: { type: Number, default: 0 },
    },
    sellers: {
      alertsCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

DashboardSnapshotSchema.index({ ownerId: 1, date: 1 }, { unique: true });

export default mongoose.model("DashboardSnapshot", DashboardSnapshotSchema);
