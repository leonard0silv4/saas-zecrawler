import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas em arquivos próprios: mudam pouco e ficam no cache do navegador entre deploys.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom", "react-helmet-async"],
          charts: ["recharts"],
          motion: ["motion"],
          query: ["@tanstack/react-query", "@tanstack/react-virtual", "axios"],
          dates: ["date-fns", "react-day-picker"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3333",
    },
  },
});
