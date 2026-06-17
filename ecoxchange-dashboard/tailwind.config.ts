import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        darkBg: "#1B4D35",
        medGreen: "#2E7D52",
        accentBrt: "#76C945",
        lightGreen: "#8DC4A4",
        paleGreen: "#C8E8D4",
        cream: "#F7F3EE",
        textDark: "#1A1A1A",
        textMuted: "#6B7B6E",
        flagAmber: "#D97706",
      },
      fontFamily: {
        heading: ["Georgia", "serif"],
        body: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: ["IBM Plex Mono", "SF Mono", "Fira Code", "monospace"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "badge-pulse": {
          "0%": { transform: "scale(0.8)", opacity: "0.4" },
          "70%": { transform: "scale(1.06)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 250ms ease-out both",
        "badge-pulse": "badge-pulse 600ms ease-out both",
      },
    },
  },
  plugins: [typography],
} satisfies Config;
