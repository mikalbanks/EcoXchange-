import type {
  Project,
  Document,
  DataRoomChecklistItem,
  CapitalStack,
  EnergyProduction,
  Ppa,
} from "@shared/schema";

// ─── Readiness Scoring Engine ────────────────────────────────────────────────

export function computeReadiness(
  project: Project,
  documents: Document[],
  checklist: DataRoomChecklistItem[],
  capitalStack: CapitalStack | undefined,
): {
  score: number;
  rating: string;
  reasons: string[];
  flags: Record<string, boolean>;
} {
  let score = 100;
  const reasons: string[] = [];
  const flags: Record<string, boolean> = {
    feocRisk: false,
    missingDocs: false,
    interconnectionRisk: false,
    permittingRisk: false,
    siteControlRisk: false,
    offtakerRisk: false,
  };

  switch (project.siteControlStatus) {
    case "NONE":
      score -= 25;
      reasons.push(
        "No site control (-25): Obtain at minimum a LOI or Option agreement",
      );
      flags.siteControlRisk = true;
      break;
    case "LOI":
      score -= 15;
      reasons.push(
        "Site control is LOI only (-15): Upgrade to Option or Lease",
      );
      break;
    case "OPTION":
      score -= 8;
      reasons.push("Site control is Option (-8): Consider upgrading to Lease");
      break;
  }

  switch (project.interconnectionStatus) {
    case "UNKNOWN":
      score -= 20;
      reasons.push(
        "Interconnection status unknown (-20): Submit interconnection application",
      );
      flags.interconnectionRisk = true;
      break;
    case "APPLIED":
      score -= 15;
      reasons.push(
        "Interconnection application submitted (-15): Await study results",
      );
      break;
    case "STUDY":
      score -= 10;
      reasons.push(
        "Interconnection in study phase (-10): Work toward IA execution",
      );
      break;
    case "IA_EXECUTED":
      score -= 3;
      reasons.push("IA executed (-3): Proceed to construction readiness");
      break;
  }

  switch (project.permittingStatus) {
    case "UNKNOWN":
      score -= 15;
      reasons.push("Permitting status unknown (-15): Begin permitting process");
      flags.permittingRisk = true;
      break;
    case "IN_PROGRESS":
      score -= 10;
      reasons.push(
        "Permitting in progress (-10): Complete and submit permit applications",
      );
      break;
    case "SUBMITTED":
      score -= 5;
      reasons.push("Permits submitted (-5): Await approval");
      break;
  }

  switch (project.offtakerType) {
    case "MERCHANT":
      score -= 12;
      reasons.push(
        "Merchant offtaker (-12): Higher revenue risk without contracted buyer",
      );
      flags.offtakerRisk = true;
      break;
    case "COMMUNITY_SOLAR":
      score -= 6;
      reasons.push(
        "Community solar offtaker (-6): Moderate subscriber acquisition risk",
      );
      break;
    case "C_AND_I":
      score -= 4;
      reasons.push(
        "C&I offtaker (-4): Verify creditworthiness of counterparty",
      );
      break;
    case "UTILITY":
      score -= 2;
      reasons.push("Utility offtaker (-2): Strong counterparty, minimal risk");
      break;
  }

  const missingRequired = checklist.filter(
    (item) => item.required && item.status === "MISSING",
  );
  const docDeduction = Math.min(missingRequired.length * 3, 24);
  if (docDeduction > 0) {
    score -= docDeduction;
    reasons.push(
      `${missingRequired.length} required documents missing (-${docDeduction}): Upload outstanding items`,
    );
    flags.missingDocs = true;
  }

  if (capitalStack) {
    const taxCreditEst = Number(capitalStack.taxCreditEstimated) || 0;
    if (taxCreditEst <= 0) {
      score -= 8;
      reasons.push(
        "Tax credit estimate missing (-8): Provide estimated tax credit value",
      );
    }
    if (!capitalStack.taxCreditTransferabilityReady) {
      score -= 6;
      reasons.push(
        "Tax credit transferability not ready (-6): Confirm transferability eligibility",
      );
    }
  } else {
    score -= 14;
    reasons.push(
      "No capital stack defined (-14): Complete financial information",
    );
  }

  if (!project.feocAttested) {
    score -= 8;
    reasons.push(
      "FEOC attestation not provided (-8): Complete FEOC compliance attestation",
    );
    flags.feocRisk = true;
  }

  score = Math.max(0, score);

  const hasFatalFlag =
    project.siteControlStatus === "NONE" ||
    (project.interconnectionStatus === "UNKNOWN" &&
      (project.stage === "NTP" || project.stage === "CONSTRUCTION"));

  let rating: string;
  if (score >= 75 && !hasFatalFlag) {
    rating = "GREEN";
  } else if (score < 50 || hasFatalFlag) {
    rating = "RED";
  } else {
    rating = "YELLOW";
  }

  const topReasons = reasons.slice(0, 5);

  return { score, rating, reasons: topReasons, flags };
}

// ─── Checklist Generation ────────────────────────────────────────────────────

export function generateChecklist(
  project: Project,
): Array<{ key: string; label: string; required: boolean }> {
  const items: Array<{ key: string; label: string; required: boolean }> = [
    {
      key: "site_control",
      label: "Site Control Documentation (LOI/Option/Lease)",
      required: true,
    },
    {
      key: "interconnection",
      label: "Interconnection Application / Status Evidence",
      required: true,
    },
    { key: "permitting", label: "Permitting Evidence", required: true },
    { key: "financial_model", label: "Basic Financial Model", required: true },
    {
      key: "feoc_attestation",
      label: "FEOC Compliance Attestation",
      required: true,
    },
  ];

  const stage = project.stage;
  if (stage === "NTP" || stage === "CONSTRUCTION" || stage === "COD") {
    items.push({
      key: "epc_contract",
      label: "EPC Contract or Term Sheet",
      required: true,
    });
    items.push({
      key: "insurance",
      label: "Insurance Evidence",
      required: false,
    });
  }

  return items;
}

// ─── Capital Stack Engine ────────────────────────────────────────────────────

export function computeCapitalStack(
  totalCapex: number,
  taxCreditEstimated: number,
): { equityNeeded: number; debtPlaceholder: number } {
  return {
    equityNeeded: Math.max(totalCapex - taxCreditEstimated, 0),
    debtPlaceholder: 0,
  };
}

// ─── Yield Computation Engine ─────────────────────────────────────────────────

export function computeRevenue(
  production: EnergyProduction,
  ppa: Ppa,
): { grossRevenue: number; netRevenue: number; operatingExpenses: number } {
  const mwh = parseFloat(production.productionMwh);
  const pricePerMwh = parseFloat(ppa.pricePerMwh);
  const grossRevenue = mwh * pricePerMwh;
  const opexRate = 0.15;
  const operatingExpenses = grossRevenue * opexRate;
  const netRevenue = grossRevenue - operatingExpenses;
  return {
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    netRevenue: Math.round(netRevenue * 100) / 100,
    operatingExpenses: Math.round(operatingExpenses * 100) / 100,
  };
}

export function computeDistribution(
  netRevenue: number,
  platformFeeRate: number = 0.0075,
): { totalDistributable: number; investorShare: number; platformFee: number } {
  const platformFee = Math.round(netRevenue * platformFeeRate * 100) / 100;
  const investorShare = Math.round((netRevenue - platformFee) * 100) / 100;
  return { totalDistributable: netRevenue, investorShare, platformFee };
}
