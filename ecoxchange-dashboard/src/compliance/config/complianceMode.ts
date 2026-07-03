/**
 * Compliance mode — a third, independent axis from data mode (Supabase vs
 * static demo JSON) and presentation state (DemoContext.demoMode):
 *
 *   'demo'    — Public demonstration. No real offering. Demo banners visible
 *               everywhere; yields are "modeled estimates"; no gate.
 *               Default, and the mode for demo.ecoxchange.net.
 *   'preview' — Pre-offering preview for individually invited accredited
 *               investors. Accreditation self-cert gate required; yields are
 *               "projected".
 *   'live'    — Live Reg D 506(c) offering. DO NOT ENABLE WITHOUT SECURITIES
 *               COUNSEL SIGN-OFF (startup guard in main.tsx enforces
 *               VITE_COUNSEL_APPROVED=true).
 *
 * Baked at build time (Vite env), so switching modes means a separate build.
 */
export type ComplianceMode = "demo" | "preview" | "live";

const VALID_MODES: readonly ComplianceMode[] = ["demo", "preview", "live"];

function parseMode(raw: string | undefined): ComplianceMode {
  return VALID_MODES.includes(raw as ComplianceMode)
    ? (raw as ComplianceMode)
    : "demo";
}

export const complianceMode: ComplianceMode = parseMode(
  import.meta.env.VITE_COMPLIANCE_MODE,
);

/** Live mode is refused at startup unless counsel has explicitly signed off. */
export const counselApproved: boolean =
  import.meta.env.VITE_COUNSEL_APPROVED === "true";
