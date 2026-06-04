import Cookie from "../models/Cookie.js";
import mongoose from "mongoose";

/**
 * Loads cookies for ownerId. Falls back to any other user's cookie set if the
 * owner has none configured, so cookie-dependent flows keep working for new/unconfigured users.
 */
export async function loadCookiesWithFallback(ownerId) {
  const oid = new mongoose.Types.ObjectId(String(ownerId));

  const userCookies = await Cookie.find({ ownerId: oid }).lean();
  if (userCookies.length) {
    return {
      cookieString: userCookies.map((c) => `${c.name}=${c.value}`).join("; "),
      isFallback: false,
    };
  }

  const fallbackOwner = await Cookie.findOne({ ownerId: { $ne: oid } })
    .select("ownerId")
    .lean();

  if (fallbackOwner) {
    const fallbackCookies = await Cookie.find({ ownerId: fallbackOwner.ownerId }).lean();
    if (fallbackCookies.length) {
      console.info(`[cookieLoader] Usando cookies de fallback para ownerId=${ownerId}`);
      return {
        cookieString: fallbackCookies.map((c) => `${c.name}=${c.value}`).join("; "),
        isFallback: true,
      };
    }
  }

  return { cookieString: "", isFallback: false };
}
