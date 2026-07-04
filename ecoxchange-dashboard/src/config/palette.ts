// Brand palette (Spec 03 extended). The first block mirrors the Tailwind color
// tokens exactly; the extensions add depth, ambient, and status values for
// gradients, overlays, and the particle/heartbeat systems.
export const palette = {
  // === Existing brand (unchanged) ===
  darkBg: "#1B4D35",
  medGreen: "#2E7D52",
  accentBrt: "#76C945",
  lightGreen: "#8DC4A4",
  paleGreen: "#C8E8D4",
  cream: "#F7F3EE",
  textDark: "#1A1A1A",
  textMuted: "#6B7B6E",
  flagAmber: "#D97706",
  white: "#FFFFFF",
  olive: "#7A9B6D",

  // === Depth & ambient ===
  darkBgDeep: "#0F3322",
  darkBgSurface: "#1A4430",
  glowGreen: "rgba(118, 201, 69, 0.08)",
  glowGreenHover: "rgba(118, 201, 69, 0.15)",
  borderSubtle: "rgba(27, 77, 53, 0.08)",
  borderMedium: "rgba(27, 77, 53, 0.15)",
  overlayDark: "rgba(15, 51, 34, 0.6)",

  // === Status ===
  statusVerified: "#76C945",
  statusFlagged: "#E5A033",
  statusPending: "#8DC4A4",
  statusError: "#C44545",

  // === Nature gradient stops ===
  gradientSunrise: ["#F7F3EE", "#C8E8D4"],
  gradientForest: ["#1B4D35", "#0F3322"],
  gradientLeaf: ["#76C945", "#2E7D52"],
  gradientGold: ["#E5A033", "#C48820"],
} as const;
