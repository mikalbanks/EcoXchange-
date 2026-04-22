export type CatalogTechnology = "SOLAR" | "SOLAR_STORAGE";
export type CatalogStage = "PRE_NTP" | "NTP" | "CONSTRUCTION" | "COD";

export interface CatalogProjectRow {
  slug: string;
  name: string;
  technology: CatalogTechnology;
  stage: CatalogStage;
  state: string;
  county: string;
  latitude: string;
  longitude: string;
  capacityMW: string;
  offtakerType: "UTILITY" | "C_AND_I" | "COMMUNITY_SOLAR" | "MERCHANT";
  interconnectionStatus: "IA_EXECUTED" | "APPLIED" | "STUDY" | "READY_TO_BUILD" | "UNKNOWN";
  permittingStatus: "APPROVED" | "IN_PROGRESS" | "SUBMITTED" | "UNKNOWN";
  siteControlStatus: "LEASE" | "OWNED" | "OPTION" | "LOI" | "NONE";
  feocAttested: boolean;
  ppaRate: string;
  monthlyDebtService: string;
  monthlyOpex: string;
  reserveRate: string;
  summary: string;
  totalCapex: string;
  taxCreditType: "ITC" | "PTC" | "UNKNOWN";
  taxCreditEstimated: string;
  taxCreditTransferabilityReady: boolean;
  equityNeeded: string;
  capitalNotes: string | null;
  offtakerName: string;
  pricePerMwh: string;
  escalationType: "FIXED" | "ESCALATING";
  escalationRate: string;
  /** Public auction / listing page where bidders can verify asset and bid outcome (optional). */
  listingUrl?: string | null;
  /** When true, investor UI omits offtaker / counterparty fields (auction-style listings). */
  hideOfftakerInInvestorUi?: boolean;
  /** Copied from auction CSV when present (optional structured display). */
  auctionBidStatus?: string | null;
  auctionStatusOutcome?: string | null;
  auctionWinningBid?: string | null;
  auctionClosingInformation?: string | null;
}
