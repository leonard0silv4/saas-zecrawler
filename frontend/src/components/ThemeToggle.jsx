import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

/** Botão sol/lua que alterna entre tema escuro e claro. */
export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const label = isLight ? "Mudar para tema escuro" : "Mudar para tema claro";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line/15 bg-surface-2/70 text-fg-muted transition-colors hover:border-line/30 hover:text-fg ${className}`}
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
