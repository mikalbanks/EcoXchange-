/**
 * Brand tokens + StyleSheet for the Production Verification Report.
 *
 * Palette mirrors the EcoXchange report spec: forest dark green, lime accent,
 * pale green table fills. US Letter, 0.75" margins.
 */
import { StyleSheet } from "@react-pdf/renderer";
import { MONO_FAMILY } from "../fonts";

export const colors = {
  darkGreen: "#1B4D35",
  medGreen: "#2E7D52",
  lime: "#76C945",
  paleGreen: "#C8E8D4",
  paleGreenAlt: "#E5F4EC",
  ink: "#1A1A1A",
  muted: "#6B7B6E",
  white: "#FFFFFF",
  border: "#D5DED8",
} as const;

export const MONO = MONO_FAMILY;
export const SERIF = "Times-Roman";
export const SANS = "Helvetica";
export const SANS_BOLD = "Helvetica-Bold";

// US Letter content width with 0.75" margins: 612 - 2*54 = 504pt.
export const PAGE_PADDING = 54;
export const CONTENT_WIDTH = 612 - PAGE_PADDING * 2;

export const styles = StyleSheet.create({
  page: {
    paddingTop: 84, // room for the fixed banner header
    paddingBottom: 56, // room for the fixed footer
    paddingHorizontal: PAGE_PADDING,
    fontFamily: SANS,
    fontSize: 10,
    color: colors.ink,
    lineHeight: 1.4,
  },
  coverPage: {
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: 72,
    fontFamily: SANS,
    fontSize: 10,
    color: colors.ink,
  },

  // ── Banner header (fixed, content pages) ──────────────────────────────────
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 54,
    backgroundColor: colors.darkGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAGE_PADDING,
  },
  bannerWordmark: {
    color: colors.white,
    fontFamily: SERIF,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  bannerWordmarkAccent: { color: colors.lime },
  bannerTag: {
    color: colors.paleGreen,
    fontFamily: MONO,
    fontSize: 7,
    letterSpacing: 1,
  },

  // ── Footer (fixed) ────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 24,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  footerText: { fontFamily: MONO, fontSize: 8, color: colors.muted },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: { marginBottom: 10, marginTop: 4 },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 16,
    color: colors.darkGreen,
    marginBottom: 4,
  },
  sectionRule: { height: 1.5, backgroundColor: colors.darkGreen, width: "100%" },

  // ── Sub-labels ────────────────────────────────────────────────────────────
  blockLabel: {
    fontFamily: SANS_BOLD,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.darkGreen,
    marginTop: 14,
    marginBottom: 6,
  },
  body: { fontSize: 10, color: colors.ink, marginBottom: 4 },
  bodyMuted: { fontSize: 9.5, color: colors.muted },
  bullet: { flexDirection: "row", marginBottom: 2 },
  bulletDot: { width: 10, fontSize: 10, color: colors.medGreen },
  bulletText: { flex: 1, fontSize: 9.5, color: colors.ink },

  // ── Stat bar ──────────────────────────────────────────────────────────────
  statBar: {
    backgroundColor: colors.darkGreen,
    borderRadius: 4,
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statCell: {
    flex: 1,
    paddingHorizontal: 8,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  statValue: { fontFamily: MONO, fontSize: 16, color: colors.lime, marginBottom: 3 },
  statLabel: { fontSize: 7.5, color: colors.white, letterSpacing: 0.4, lineHeight: 1.3 },

  // ── Tables ────────────────────────────────────────────────────────────────
  table: { width: "100%", borderWidth: 0.5, borderColor: colors.border },
  tableHeaderRow: { flexDirection: "row", backgroundColor: colors.darkGreen },
  tableHeaderCell: {
    color: colors.white,
    fontFamily: SANS_BOLD,
    fontSize: 8,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  tableRow: { flexDirection: "row" },
  tableRowAlt: { flexDirection: "row", backgroundColor: colors.paleGreenAlt },
  tableTotalRow: { flexDirection: "row", backgroundColor: colors.paleGreen },
  tableCell: { fontSize: 8.5, paddingVertical: 4, paddingHorizontal: 5, color: colors.ink },
  tableCellMono: {
    fontFamily: MONO,
    fontSize: 8,
    paddingVertical: 4,
    paddingHorizontal: 5,
    color: colors.ink,
  },
  tableCellBold: { fontFamily: SANS_BOLD, fontSize: 8.5 },

  // ── Two-column config table ───────────────────────────────────────────────
  configRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: colors.border },
  configKey: {
    width: "42%",
    fontSize: 9,
    color: colors.muted,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: colors.paleGreenAlt,
  },
  configVal: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 9,
    color: colors.ink,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },

  // ── Disclaimer ────────────────────────────────────────────────────────────
  disclaimer: { fontFamily: MONO, fontSize: 8, color: colors.muted, lineHeight: 1.5 },
  disclaimerRow: { flexDirection: "row", marginBottom: 2 },
  disclaimerDot: { width: 9, fontFamily: MONO, fontSize: 8, color: colors.muted },
  disclaimerText: { flex: 1, fontFamily: MONO, fontSize: 8, color: colors.muted, lineHeight: 1.5 },

  chartCaption: { fontFamily: MONO, fontSize: 7.5, color: colors.muted, marginTop: 4 },
});
