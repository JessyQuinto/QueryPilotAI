import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import containerQueries from "@tailwindcss/container-queries";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./providers/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#a78bfa",
        "on-background": "#f4f0e6",
        "surface-variant": "#222222",
        "primary-container": "#1a2a00",
        "on-surface-variant": "#a3a3a3",
        "secondary-container": "#333333",
        "on-tertiary-fixed": "#000000",
        "secondary-fixed": "#e0e0e0",
        "tertiary": "#a78bfa",
        "surface-container-low": "#050505",
        "on-secondary-fixed": "#000000",
        "on-secondary-container": "#f4f0e6",
        "on-primary-fixed-variant": "#223300",
        "inverse-surface": "#f4f0e6",
        "background": "#000000",
        "on-primary-fixed": "#000000",
        "secondary-fixed-dim": "#a3a3a3",
        "inverse-primary": "#f4f0e6",
        "surface-container-highest": "#333333",
        "on-secondary": "#000000",
        "on-tertiary-container": "#f4f0e6",
        "secondary": "#a3a3a3",
        "surface-container-high": "#111111",
        "on-error-container": "#ffb4ab",
        "tertiary-fixed-dim": "#8b5cf6",
        "surface-container": "#0a0a0a",
        "primary-fixed": "#8b5cf6",
        "outline": "#444444",
        "on-surface": "#f4f0e6",
        "primary-fixed-dim": "#a78bfa",
        "on-secondary-fixed-variant": "#222222",
        "tertiary-fixed": "#c4b5fd",
        "outline-variant": "#333333",
        "surface-tint": "#a78bfa",
        "error": "#ffb4ab",
        "tertiary-container": "#222222",
        "surface-dim": "#000000",
        "error-container": "#93000a",
        "on-primary-container": "#a78bfa",
        "on-primary": "#000000",
        "surface": "#0a0a0a",
        "on-tertiary": "#000000",
        "on-error": "#690005",
        "on-tertiary-fixed-variant": "#111111",
        "surface-bright": "#222222",
        "surface-container-lowest": "#000000",
        "inverse-on-surface": "#111111"
      },
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"]
      },
    },
  },
  plugins: [forms, containerQueries],
};
export default config;
