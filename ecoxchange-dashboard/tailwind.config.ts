import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Full override (not extend): a smaller `xs` breakpoint must sort before
    // `sm` for Tailwind's mobile-first cascade to stay correct.
    screens: {
      xs: "375px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
    },
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
        "slide-down": {
          "0%": { opacity: "0", maxHeight: "0" },
          "100%": { opacity: "1", maxHeight: "200px" },
        },
        "slide-in-top": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 250ms ease-out both",
        "badge-pulse": "badge-pulse 600ms ease-out both",
        "slide-down": "slide-down 200ms ease-out both",
        "slide-in-top": "slide-in-top 300ms ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
