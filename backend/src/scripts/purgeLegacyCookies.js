import dotenv from "dotenv";
import mongoose from "mongoose";
import Cookie from "../models/Cookie.js";

dotenv.config();

/**
 * Remove todos os cookies do Mercado Livre salvos pelos usuários.
 * A coleta passou a usar a API oficial do ML (set/2026) e os cookies de sessão
 * guardados no banco não têm mais uso — manter credenciais sem uso é risco.
 */
async function main() {
  await mongoose.connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`
  );

  const { deletedCount } = await Cookie.deleteMany({});
  console.log(`Cookies removidos: ${deletedCount}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
