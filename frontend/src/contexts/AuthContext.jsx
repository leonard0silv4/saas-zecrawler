import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    if (token && stored) {
      setUser(JSON.parse(stored));
      // Refresh user data
      api.get("/auth/me").then((r) => {
        setUser(r.data.user);
        localStorage.setItem("user", JSON.stringify(r.data.user));
      }).catch(() => logout());
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }

  async function register(name, email, password) {
    const { data } = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  function canAccess(module) {
    if (module == null) return true;
    const allowed = user?.allowedModules;
    if (Array.isArray(allowed)) {
      return allowed.includes(module);
    }
    const plan = user?.effectivePlan || user?.plan || "free";
    if (!user?.planConfig) return false;
    const moduleMap = {
      links: ["free", "starter", "pro", "business"],
      priceAnalyze: ["free", "starter", "pro", "business"],
      catalog: ["pro", "business"],
      meli: ["starter", "pro", "business"],
      meliMessages: ["business"],
      meliAnalytics: ["business"],
      sellerMonitor: ["free", "starter", "pro", "business"],
    };
    return moduleMap[module]?.includes(plan) || false;
  }

  function isBlockedByPlan(module) {
    if (module == null) return false;
    const planMods = user?.planModules;
    if (Array.isArray(planMods)) {
      return !planMods.includes(module);
    }
    const plan = user?.effectivePlan || user?.plan || "free";
    const moduleMap = {
      links: ["free", "starter", "pro", "business"],
      priceAnalyze: ["free", "starter", "pro", "business"],
      catalog: ["pro", "business"],
      meli: ["starter", "pro", "business"],
      meliMessages: ["business"],
      meliAnalytics: ["business"],
      sellerMonitor: ["free", "starter", "pro", "business"],
    };
    return !(moduleMap[module]?.includes(plan) || false);
  }

  async function refreshUser() {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch {
      logout();
    }
  }

  async function manageBilling() {
    const { data } = await api.post("/stripe/portal");
    window.location.href = data.url;
  }

  async function deleteAccount() {
    await api.delete("/auth/account");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  const isOwner = user?.role === "owner";

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, canAccess, isBlockedByPlan, refreshUser, manageBilling, deleteAccount, isOwner }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
