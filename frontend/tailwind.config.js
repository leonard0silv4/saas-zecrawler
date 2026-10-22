import defaultColors from "tailwindcss/colors";

/**
 * Tema "Holo" — dark futurista.
 *
 * Tokens semânticos (surface, line, fg, glow, neon) vêm de CSS vars em
 * src/styles/globals.css. `brand` = azul da logo; `brandSolid` é o mesmo
 * valor, mantido como alias usado pelos componentes do redesign.
 * Tema claro: `:root[data-theme="light"]` em globals.css redefine as vars.
 */
const brand = {
  50: "#eef6ff",
  100: "#d9eaff",
  200: "#b4d4ff",
  300: "#7fb6ff",
  400: "#4a95ff",
  500: "#1e7bff",
  600: "#0f66e8",
  700: "#0b52c0",
  800: "#0d4396",
  900: "#0f3871",
  950: "#0a2147",
};

// Tons claros usados como texto mudam com o tema (escuro: claros; claro: escuros).
const themedBrand = {
  ...brand,
  200: "rgb(var(--brand-200) / <alpha-value>)",
  300: "rgb(var(--brand-300) / <alpha-value>)",
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: themedBrand,
        brandSolid: themedBrand,
        violet: {
          ...defaultColors.violet,
          200: "rgb(var(--violet-200) / <alpha-value>)",
          300: "rgb(var(--violet-300) / <alpha-value>)",
        },
        pink: { ...defaultColors.pink, 300: "rgb(var(--pink-300) / <alpha-value>)" },
        ink: "rgb(var(--ink) / <alpha-value>)",
        scrim: "rgb(var(--scrim) / <alpha-value>)",
        void: "rgb(var(--void) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
          3: "rgb(var(--surface-3) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--line) / <alpha-value>)",
          strong: "rgb(var(--line-strong) / <alpha-value>)",
        },
        fg: {
          DEFAULT: "rgb(var(--fg) / <alpha-value>)",
          muted: "rgb(var(--fg-muted) / <alpha-value>)",
          dim: "rgb(var(--fg-dim) / <alpha-value>)",
        },
        glow: "rgb(var(--glow) / <alpha-value>)",
        neon: "rgb(var(--neon) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', '"DM Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--glow) / 0.25), 0 0 24px -4px rgb(var(--glow) / 0.45)",
        "glow-brand": "0 0 0 1px rgb(30 123 255 / 0.4), 0 8px 32px -8px rgb(30 123 255 / 0.6)",
        "glow-neon": "0 0 18px -2px rgb(var(--neon) / 0.55)",
        panel: "0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 20px 40px -24px rgb(0 0 0 / 0.8)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.85)" },
        },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "spin-slow": "spin-slow 18s linear infinite",
        "spin-slower": "spin-slow 40s linear infinite reverse",
        scan: "scan 6s linear infinite",
      },
    },
  },
  plugins: [],
};
