import MeliQuestion from "../models/MeliQuestion.js";
import MeliOrder from "../models/MeliOrder.js";
import SellerAlert from "../models/SellerAlert.js";

const RETENTION_DAYS = 90;

export async function runDataCleanup() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const [questions, orders, alerts] = await Promise.all([
    MeliQuestion.deleteMany({ createdAt: { $lt: cutoff } }),
    MeliOrder.deleteMany({ createdAt: { $lt: cutoff } }),
    SellerAlert.deleteMany({ createdAt: { $lt: cutoff } }),
  ]);

  console.log(
    `[Cleanup] questions=${questions.deletedCount} orders=${orders.deletedCount} alerts=${alerts.deletedCount}`
  );
  return {
    questions: questions.deletedCount,
    orders: orders.deletedCount,
    alerts: alerts.deletedCount,
  };
}
