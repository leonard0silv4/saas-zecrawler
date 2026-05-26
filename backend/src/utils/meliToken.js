import axios from "axios";

/**
 * Renews ML access token if expired, saves to DB.
 */
export async function renewToken(conta, { force = false } = {}) {
  if (!force && new Date() < conta.expires_at) return conta.access_token;

  try {
    console.log(`Renovando token para conta ${conta.user_id}...`);
    const { data } = await axios.post("https://api.mercadolibre.com/oauth/token", null, {
      params: {
        grant_type: "refresh_token",
        client_id: process.env.ML_CLIENT_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        refresh_token: conta.refresh_token,
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    conta.access_token = data.access_token;
    conta.refresh_token = data.refresh_token;
    conta.expires_at = new Date(Date.now() + data.expires_in * 1000);
    await conta.save();

    return data.access_token;
  } catch (err) {
    console.error("Erro ao renovar token:", err.response?.data || err.message);
    throw new Error("Falha ao renovar token de acesso");
  }
}
