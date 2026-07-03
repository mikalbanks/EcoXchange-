/**
 * Centralized banner text. ALL banner language lives here so securities
 * counsel can revise it in one place without touching page components.
 *
 * PLACEHOLDER LANGUAGE — subject to securities counsel review before any
 * investor-facing deployment.
 */
import type { ComplianceMode } from "./complianceMode.js";

export interface BannerConfig {
  /** RegDBanner text (top regulatory notice). Empty in demo mode. */
  regD: string;
  /** DemoModeBanner text (top demonstration indicator). Empty outside demo. */
  demo: string;
}

export const bannerConfig: Record<ComplianceMode, BannerConfig> = {
  demo: {
    regD: "",
    demo: "DEMONSTRATION MODE · SIMULATED DATA · NOT AN INVESTMENT OFFERING",
  },
  preview: {
    regD: "FOR ACCREDITED INVESTORS ONLY · THIS IS NOT AN OFFER TO SELL SECURITIES · REG D 506(C)",
    demo: "",
  },
  live: {
    regD: "SECURITIES OFFERED UNDER REG D RULE 506(C) · FOR VERIFIED ACCREDITED INVESTORS ONLY · [SPV NAME] LLC",
    demo: "",
  },
};
