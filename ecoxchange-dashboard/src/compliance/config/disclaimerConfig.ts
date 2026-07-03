/**
 * Centralized disclaimer text blocks, per compliance mode. ALL disclaimer
 * language lives here so securities counsel can revise it in one place.
 *
 * PLACEHOLDER LANGUAGE — subject to securities counsel review before any
 * investor-facing deployment. Live-mode blocks are intentionally left as
 * [PLACEHOLDER] markers until counsel review happens.
 */
import type { ComplianceMode } from "./complianceMode.js";

export interface DisclaimerConfig {
  /** Interpolated into the † legend: "All return and yield figures are {yieldBasis}…" */
  yieldBasis: string;
  /** Mode-specific disclaimer paragraphs, rendered in order. */
  blocks: string[];
}

export const disclaimerConfig: Record<ComplianceMode, DisclaimerConfig> = {
  demo: {
    yieldBasis:
      "methodology-documented estimates based on backtest simulations using historical weather and production data",
    blocks: [
      "This platform is a technology demonstration. No securities are being offered or sold. All data displayed is simulated using historical backtest scenarios and does not represent any actual investment, project, or financial instrument.",
      "EcoXchange is in development. The verification engine, distribution mechanics, and investor dashboard shown here represent the intended product architecture. Actual product features, terms, and availability are subject to change.",
      "No investment advice is provided. Nothing on this platform constitutes an offer to sell, a solicitation of an offer to buy, or a recommendation of any security or investment product.",
    ],
  },
  preview: {
    yieldBasis:
      "projections based on contracted PPA rates, historical production data, and methodology-documented engineering estimates",
    blocks: [
      "Securities described herein have not been registered under the Securities Act of 1933, as amended, and may not be offered or sold in the United States absent registration or an applicable exemption from registration requirements.",
      "This material is provided for informational purposes only to pre-qualified accredited investors and does not constitute an offer to sell or solicitation of an offer to buy any security. Any such offer will be made only by means of a Private Placement Memorandum.",
      "Investment in solar project securities involves significant risk, including the potential loss of invested capital. Investors should review all risk factors in the PPM before investing.",
    ],
  },
  live: {
    yieldBasis:
      "projections based on contracted PPA rates, verified historical production, and engineering estimates reviewed by [COUNSEL NAME]",
    blocks: [
      "[PLACEHOLDER — FULL REG D 506(C) DISCLAIMER — REQUIRES SECURITIES COUNSEL REVIEW BEFORE USE]",
      "[PLACEHOLDER — RISK FACTORS SUMMARY — CROSS-REFERENCE TO PPM SECTION]",
      "[PLACEHOLDER — BROKER-DEALER ATTRIBUTION — FINALIS SECURITIES LLC, MEMBER FINRA/SIPC]",
    ],
  },
};
