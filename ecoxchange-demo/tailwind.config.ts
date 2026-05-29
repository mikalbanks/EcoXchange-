import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        eco: {
          dark: "#1B4D35",
          mid: "#2E7D52",
          logo: "#2B6E44",
          lime: "#76C945",
          olive: "#7A9B6D",
          cream: "#F7F3EE",
          pale: "#E8F0EA",
          border: "#D4DDD6",
          line: "#C8D4CA",
          verified: "#2E7D52",
          "verified-bg": "#EAF4ED",
          flagged: "#C17B1A",
          "flagged-bg": "#FBF4E8",
          error: "#9E2A2A",
          "cta-olive": "#8BAF40",
          "text-primary": "#1A1A1A",
          "text-body": "#3D3D3D",
          "text-muted": "#6B7B6E",
          "text-light": "#8CA18F",
          "stat-band": "#1B4D35",
          "gradient-top": "#2C5A3B",
          "gradient-bot": "#1B4D35",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', '"Libre Baskerville"', "Georgia", "serif"],
        body: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: ['"IBM Plex Mono"', '"SF Mono"', '"Fira Code"', "Consolas", "monospace"],
      },
      letterSpacing: {
        tag: "0.2em",
        nav: "0.15em",
        cta: "0.18em",
      },
      maxWidth: {
        site: "1140px",
        prose: "680px",
      },
    },
  },
  plugins: [],
} satisfies Config;
