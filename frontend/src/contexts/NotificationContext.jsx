import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const POLL_MS = 90_000; // 90 segundos

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState({});
  const [hasMeliAccount, setHasMeliAccount] = useState(true); // true por default para não piscar na carga inicial
  const [lastMeliQuestionEvent, setLastMeliQuestionEvent] = useState(null);
  const timerRef = useRef(null);
  const eventSourceRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/meli/messages/unread-count");
      setUnreadCounts(data.perAccount || {});
    } catch {
      // silencioso — badge não é crítico
    }
  }, [user]);

  // Links, Análise de Preços e Monitor de Sellers usam a API oficial do ML → exigem conta conectada
  const fetchMeliAccountStatus = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/meli/accounts");
      setHasMeliAccount(Array.isArray(data) && data.length > 0);
    } catch {
      // silencioso — banner não é crítico (ex.: membro sem permissão do módulo)
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCounts({});
      setHasMeliAccount(true);
      setLastMeliQuestionEvent(null);
      return;
    }
    fetchUnread();
    fetchMeliAccountStatus();
    timerRef.current = setInterval(() => {
      if (!document.hidden) fetchUnread();
    }, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [user, fetchUnread, fetchMeliAccountStatus]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const envUrl = import.meta.env.VITE_API_URL;
    const apiRoot = envUrl ? String(envUrl).replace(/\/$/, "") + "/api" : "/api";
    const source = new EventSource(apiRoot + "/events?token=" + encodeURIComponent(token));
    eventSourceRef.current = source;

    source.onerror = () => {
      console.warn("[NotificationContext] SSE disconnected");
    };

    source.addEventListener("meli:question", (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        setLastMeliQuestionEvent({ ...payload, receivedAt: Date.now() });
        fetchUnread();
      } catch {
        // Ignore malformed SSE payloads.
      }
    });

    return () => {
      source.close();
      if (eventSourceRef.current === source) eventSourceRef.current = null;
    };
  }, [user, fetchUnread]);

  function hasDotForUserId(userId) {
    return (unreadCounts[String(userId)] ?? 0) > 0;
  }

  const hasAnyDot = Object.values(unreadCounts).some((c) => c > 0);

  return (
    <NotificationContext.Provider
      value={{
        unreadCounts,
        hasDotForUserId,
        hasAnyDot,
        fetchUnread,
        hasMeliAccount,
        refreshMeliAccountStatus: fetchMeliAccountStatus,
        lastMeliQuestionEvent,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications deve ser usado dentro de NotificationProvider");
  return ctx;
}
