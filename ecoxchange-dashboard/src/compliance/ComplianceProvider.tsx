import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { complianceMode } from "./config/complianceMode.js";
import type { ComplianceMode } from "./config/complianceMode.js";
import { bannerConfig } from "./config/bannerConfig.js";
import type { BannerConfig } from "./config/bannerConfig.js";
import { disclaimerConfig } from "./config/disclaimerConfig.js";
import type { DisclaimerConfig } from "./config/disclaimerConfig.js";

interface ComplianceContextValue {
  mode: ComplianceMode;
  banners: BannerConfig;
  disclaimers: DisclaimerConfig;
  isDemo: boolean;
  isLive: boolean;
  showYieldDisclosure: boolean;
  showAccreditationGate: boolean;
}

const ComplianceContext = createContext<ComplianceContextValue | null>(null);

/**
 * App-wide compliance context. Mode is baked at build time
 * (VITE_COMPLIANCE_MODE), so this value is static for a given deployment —
 * demo.ecoxchange.net is a 'demo' build, an investor preview is a 'preview'
 * build, etc.
 */
export function ComplianceProvider({ children }: { children: ReactNode }) {
  const value: ComplianceContextValue = {
    mode: complianceMode,
    banners: bannerConfig[complianceMode],
    disclaimers: disclaimerConfig[complianceMode],
    isDemo: complianceMode === "demo",
    isLive: complianceMode === "live",
    showYieldDisclosure: complianceMode !== "demo",
    showAccreditationGate:
      complianceMode === "preview" || complianceMode === "live",
  };

  return (
    <ComplianceContext.Provider value={value}>
      {children}
    </ComplianceContext.Provider>
  );
}

export function useCompliance(): ComplianceContextValue {
  const ctx = useContext(ComplianceContext);
  if (!ctx) {
    throw new Error("useCompliance must be used within ComplianceProvider");
  }
  return ctx;
}
