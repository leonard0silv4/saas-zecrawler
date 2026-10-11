import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Tema da interface: "dark" (padrão) ou "light".
 * A escolha fica no localStorage ("theme") e é aplicada em <html data-theme>.
 * O script inline em index.html aplica o tema antes do primeiro paint (sem piscar).
 */
const STORAGE_KEY = "theme";
const ThemeContext = createContext({ theme: "dark", setTheme: () => {}, toggleTheme: () => {} });

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "dark";
  } catch {
    return "dark";
  }
}

function apply(theme) {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f1f5fb" : "#04070d");
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored);

  useEffect(() => { apply(theme); }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* sem storage */ }
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === "light" ? "dark" : "light"), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
