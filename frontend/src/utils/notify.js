import { toast } from "sonner";

export function notifyError(message) {
  toast.error(String(message || "Ocorreu um erro"));
}

export function notifySuccess(message) {
  toast.success(String(message || "Concluído"));
}

export function notifyWarning(message) {
  toast.warning(String(message || "Atenção"));
}

export function apiErrorMessage(error, fallback) {
  const d = error.response?.data;
  if (!d) return fallback;
  const parts = [d.error, d.hint].filter(Boolean);
  return parts.length ? parts.join("\n\n") : fallback;
}
