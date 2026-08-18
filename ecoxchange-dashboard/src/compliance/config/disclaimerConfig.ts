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
      "simulated estimates shown only inside explicitly labeled fixture-backed workflows",
    blocks: [
      "This platform is a technology demonstration. No securities are being offered or sold. The primary PVDAQ scenario combines measured public inverter data, a modeled NASA POWER expectation, and a derived utility proxy; the Savannah stress scenario and all financial figures are simulated and labeled.",
      "EcoXchange is in development. Release 1 demonstrates production verification and provenance. Offering, ownership, legal-document, and distribution execution are unavailable in the primary pilot path.",
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
      "[PLACEHOLDER — BROKER-DEALER ATTRIBUTION — POLYMATH'S FINRA-LICENSED BROKER-DEALER PARTNER, MEMBER FINRA/SIPC]",
    ],
  },
};
