// Developer LOI data model (polish spec §C.2). The LOI is NON-BINDING: it
// expresses mutual interest only. All template language is placeholder
// pending securities counsel review before use with real developers.

export type InterconnectionStatus = "approved" | "pending" | "not_filed";

export interface LOIData {
  developer: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactTitle: string;
  };
  project: {
    name: string;
    location: string;
    latitude: number;
    longitude: number;
    capacityKwDc: number;
    estimatedAnnualProductionMwh: number;
    offtakeType: "ppa" | "community_solar" | "net_metering" | "merchant";
    ppaRate?: number;
    ppaEscalator?: number;
    interconnectionStatus: InterconnectionStatus;
    commissioningDate: string;
    inverterBrand: string;
  };
  terms: {
    equityRaiseTarget: number;
    originationFeePct: number;
    platformSetupFee: number;
    targetCloseWeeks: string; // e.g. "4–6"
    servicesIncluded: string[];
    exclusivityDays: number;
  };
  generatedDate: string;
  reportId?: string;
}

export const OFFTAKE_LABELS: Record<LOIData["project"]["offtakeType"], string> = {
  ppa: "Power Purchase Agreement",
  community_solar: "Community Solar",
  net_metering: "Net Metering",
  merchant: "Merchant",
};

export const INTERCONNECTION_LABELS: Record<InterconnectionStatus, string> = {
  approved: "Approved",
  pending: "Pending",
  not_filed: "Not Yet Filed",
};

export const DEFAULT_SERVICES = [
  "Equity capital raise facilitation via Reg D 506(c) digital securities offering",
  "SPV (LLC) formation and templated offering documentation",
  "Production verification via EcoXchange's proprietary verification engine",
  "Investor onboarding, KYC/AML verification, and accreditation verification",
  "Automated monthly distribution administration",
  "Ongoing investor reporting and dashboard access",
];

/** EcoXchange standard terms — adjustable in the builder. */
export const DEFAULT_TERMS: LOIData["terms"] = {
  equityRaiseTarget: 2_500_000,
  originationFeePct: 3.0,
  platformSetupFee: 15_000,
  targetCloseWeeks: "4–6",
  servicesIncluded: DEFAULT_SERVICES,
  exclusivityDays: 90,
};
