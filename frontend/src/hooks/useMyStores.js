import { useState, useEffect } from "react";
import api from "../services/api";

/**
 * Retorna a lista combinada e deduplicada de "minhas lojas" (uppercase) do cliente logado:
 * - mySellerNames salvo em Settings (GET /settings)
 * - nicknames das contas ML conectadas (GET /meli/accounts) — 403 silenciado (free plan)
 *
 * @returns {{ myStores: string[], loading: boolean }}
 */
export function useMyStores() {
  const [myStores, setMyStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const results = await Promise.allSettled([
        api.get("/settings"),
        api.get("/meli/accounts"),
      ]);

      if (cancelled) return;

      const names = [];

      if (results[0].status === "fulfilled") {
        const arr = results[0].value.data?.mySellerNames || [];
        for (const s of arr) {
          const u = String(s).trim().toUpperCase();
          if (u) names.push(u);
        }
      }

      if (results[1].status === "fulfilled") {
        const accounts = results[1].value.data || [];
        for (const a of accounts) {
          const u = String(a.nickname || "").trim().toUpperCase();
          if (u) names.push(u);
        }
      }

      setMyStores([...new Set(names)]);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { myStores, loading };
}
