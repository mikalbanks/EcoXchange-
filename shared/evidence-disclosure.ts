export type EvidenceLevel = "verified" | "partial" | "demonstration";

export interface EvidenceDisclosure {
  level: EvidenceLevel;
  badge: string;
  title: string;
  description: string;
}

export function describePerformanceEvidence(
  verificationStatus?: string,
): EvidenceDisclosure {
  switch (verificationStatus) {
    case "VERIFIED":
      return {
        level: "verified",
        badge: "SGT ENGINE STATUS: VERIFIED",
        title: "The engine records a verified status",
        description:
          "The current record is marked VERIFIED by the SGT engine. Review the per-source provenance and verification method below before relying on the financial outputs.",
      };
    case "AUTOMATED":
      return {
        level: "partial",
        badge: "CONNECTED SOURCE",
        title: "Automated ingestion is not independent verification",
        description:
          "The production feed is connected and high quality, but this page does not establish that utility, inverter, and satellite legs are independent.",
      };
    case "SELF_REPORTED":
      return {
        level: "demonstration",
        badge: "SELF-REPORTED DATA",
        title: "Demonstration performance, not an investment record",
        description:
          "These production records are marked self-reported. They have not been independently reconciled against utility and satellite measurements.",
      };
    default:
      return {
        level: "demonstration",
        badge: "EVIDENCE NOT VERIFIED",
        title: "Source verification is not established",
        description:
          "Treat the figures on this page as a product demonstration until source provenance and independent reconciliation are available.",
      };
  }
}

export function describeBacktestEvidence(
  meterDataSource: "synthetic" | "stored" | undefined,
  satelliteSource: string,
): EvidenceDisclosure {
  if (meterDataSource !== "stored") {
    return {
      level: "demonstration",
      badge: "MODEL REPLAY",
      title: "Modeled data, not production verification",
      description:
        "The meter baseline is synthesized from site specifications. This run tests pipeline behavior and model alignment, not independent operating performance.",
    };
  }

  if (
    satelliteSource !== "SOLCAST_HISTORICAL"
    && satelliteSource !== "SOLCAST_ESTIMATED_ACTUALS"
  ) {
    return {
      level: "demonstration",
      badge: "DEPENDENT COMPARISON",
      title: "Stored records with an unverified comparison source",
      description:
        "The production records are stored, but their ingestion origin is not encoded. The comparison source is modeled or unrecognized, so independent source validation is not established.",
    };
  }

  return {
    level: "partial",
    badge: "PARTIAL EVIDENCE",
    title: "Stored production records compared with a Solcast estimate",
    description:
      "This run compares stored records with a Solcast estimate, but the response does not report source-interval coverage. It does not attest the records' origin, utility-meter provenance, or full three-source independence.",
  };
}
