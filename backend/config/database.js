import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`;

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB conectado");
  } catch (err) {
    console.error("Erro ao conectar MongoDB:", err);
    process.exit(1);
  }
}
