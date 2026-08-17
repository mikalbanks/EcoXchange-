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
    // Rectangular brand geometry (Spec 03): cards/panels/buttons are sharp
    // (lg/xl/2xl -> 0), badges/tags soft (4px), inputs subtle (2px), and only
    // status dots stay pills. Full override so all 197 existing rounded-*
    // call sites convert in one place.
    borderRadius: {
      none: "0px",
      sm: "2px",
      DEFAULT: "4px",
      md: "4px",
      lg: "0px",
      xl: "0px",
      "2xl": "0px",
      "3xl": "0px",
      full: "9999px",
    },
    extend: {
      colors: {
        darkBg: "#004d1a",
        medGreen: "#2E7D52",
        accentBrt: "#76C945",
        lightGreen: "#8DC4A4",
        paleGreen: "#C8E8D4",
        cream: "#F7F3EE",
        textDark: "#1A1A1A",
        textMuted: "#6B7B6E",
        flagAmber: "#D97706",
        // Spec 03 depth + status extensions
        olive: "#7A9B6D",
        darkBgDeep: "#0F3322",
        darkBgSurface: "#1A4430",
        statusFlagged: "#E5A033",
        statusError: "#C44545",
      },
      fontFamily: {
        // Playfair Display is the brand headline face (Spec 03 — the switch
        // deferred by Specs 06/07/08). Georgia remains the offline fallback.
        heading: ["Playfair Display", "Georgia", "serif"],
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
        // Spec 03: verified-badge ring pulse (box-shadow halo, one shot).
        "badge-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(118, 201, 69, 0.4)" },
          "70%": { boxShadow: "0 0 0 8px rgba(118, 201, 69, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(118, 201, 69, 0)" },
        },
        "page-enter": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "heartbeat-pulse": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.25)", opacity: "0.7" },
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
        "badge-pulse": "badge-pulse 1s ease-out both",
        "slide-down": "slide-down 200ms ease-out both",
        "slide-in-top": "slide-in-top 300ms ease-out both",
        "page-enter": "page-enter 300ms cubic-bezier(0.0, 0.0, 0.2, 1) both",
        "heartbeat-pulse": "heartbeat-pulse 600ms ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
