/**
 * Vendedores considerados "próprios" no XML / análise (equivalente a VENDEDORES_PROPRIOS do Python).
 * Configure PRICE_ANALYZE_MY_SELLERS no .env separado por vírgula.
 */
const DEFAULT_MY_SELLERS = [
  "NETVASOSJARDINAGEM",
  "JARDINOGARDEN",
  "LYRIAFLORES",
  "SOMBRITELA_LONDRINA",
  "SOMBRITELA",
  "SOMBRETELA",
  "-1",
];

export function getMySellerNamesUpper() {
  const raw = process.env.PRICE_ANALYZE_MY_SELLERS;
  if (raw && raw.trim()) {
    return raw
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }
  return [...DEFAULT_MY_SELLERS];
}
