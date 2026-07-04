// Typography scale (Spec 03). Documentation-grade tokens: components consume
// these via Tailwind utilities (font-heading / font-mono / text-*), and this
// module is the single reference for the intended scale.
export const typography = {
  headline: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontStyle: "italic",
    sizes: {
      hero: { fontSize: "48px", lineHeight: 1.1, letterSpacing: "-0.02em" },
      section: { fontSize: "28px", lineHeight: 1.2, letterSpacing: "-0.01em" },
      card: { fontSize: "20px", lineHeight: 1.3 },
      label: { fontSize: "16px", lineHeight: 1.4 },
    },
  },
  mono: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    sizes: {
      tag: { fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" },
      label: { fontSize: "11px", letterSpacing: "0.04em" },
      data: { fontSize: "13px", letterSpacing: "0.02em" },
      code: { fontSize: "14px" },
    },
  },
  body: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    sizes: {
      sm: { fontSize: "13px", lineHeight: 1.5 },
      base: { fontSize: "15px", lineHeight: 1.6 },
      lg: { fontSize: "17px", lineHeight: 1.6 },
    },
  },
  number: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontVariantNumeric: "tabular-nums",
    sizes: {
      stat: { fontSize: "32px", fontWeight: 600 },
      value: { fontSize: "20px", fontWeight: 500 },
      table: { fontSize: "14px", fontWeight: 400 },
    },
  },
} as const;
