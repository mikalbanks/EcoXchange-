import type { Config } from "tailwindcss";

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
      },
    },
  },
  plugins: [],
} satisfies Config;
