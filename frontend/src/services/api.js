import axios from "axios";

// Em dev, o Vite faz proxy de "/api" → backend. No build estático (ex.: http-server),
// use VITE_API_URL (ex.: http://localhost:3333) para apontar direto à API.
const envUrl = import.meta.env.VITE_API_URL;
const baseURL = envUrl
  ? `${String(envUrl).replace(/\/$/, "")}/api`
  : "/api";

const api = axios.create({
  baseURL,
});

// Inject token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
