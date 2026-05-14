# EcoXchange — Readiness Scoring Engine

The core scoring function that evaluates whether a renewable energy project is ready for digital securities tokenization. It scores projects on a 0–100 scale across site control, interconnection, permitting, offtaker quality, document completeness, capital stack, and FEOC compliance — producing a GREEN / YELLOW / RED rating with actionable guidance.

```typescript
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

  // Site control deductions
  switch (project.siteControlStatus) {
    case "NONE":
      score -= 25;
      reasons.push("No site control (-25): Obtain at minimum a LOI or Option agreement");
      flags.siteControlRisk = true;
      break;
    case "LOI":
      score -= 15;
      reasons.push("Site control is LOI only (-15): Upgrade to Option or Lease");
      break;
    case "OPTION":
      score -= 8;
      reasons.push("Site control is Option (-8): Consider upgrading to Lease");
      break;
  }

  // Interconnection deductions
  switch (project.interconnectionStatus) {
    case "UNKNOWN":
      score -= 20;
      reasons.push("Interconnection status unknown (-20): Submit interconnection application");
      flags.interconnectionRisk = true;
      break;
    case "APPLIED":
      score -= 15;
      reasons.push("Interconnection application submitted (-15): Await study results");
      break;
    case "STUDY":
      score -= 10;
      reasons.push("Interconnection in study phase (-10): Work toward IA execution");
      break;
    case "IA_EXECUTED":
      score -= 3;
      reasons.push("IA executed (-3): Proceed to construction readiness");
      break;
  }

  // Permitting deductions
  switch (project.permittingStatus) {
    case "UNKNOWN":
      score -= 15;
      reasons.push("Permitting status unknown (-15): Begin permitting process");
      flags.permittingRisk = true;
      break;
    case "IN_PROGRESS":
      score -= 10;
      reasons.push("Permitting in progress (-10): Complete and submit permit applications");
      break;
    case "SUBMITTED":
      score -= 5;
      reasons.push("Permits submitted (-5): Await approval");
      break;
  }

  // Offtaker deductions
  switch (project.offtakerType) {
    case "MERCHANT":
      score -= 12;
      reasons.push("Merchant offtaker (-12): Higher revenue risk without contracted buyer");
      flags.offtakerRisk = true;
      break;
    case "COMMUNITY_SOLAR":
      score -= 6;
      reasons.push("Community solar offtaker (-6): Moderate subscriber acquisition risk");
      break;
    case "C_AND_I":
      score -= 4;
      reasons.push("C&I offtaker (-4): Verify creditworthiness of counterparty");
      break;
    case "UTILITY":
      score -= 2;
      reasons.push("Utility offtaker (-2): Strong counterparty, minimal risk");
      break;
  }

  // Document completeness
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

  // Tax credit readiness
  if (capitalStack) {
    const taxCreditEst = Number(capitalStack.taxCreditEstimated) || 0;
    if (taxCreditEst <= 0) {
      score -= 8;
      reasons.push("Tax credit estimate missing (-8): Provide estimated tax credit value");
    }
    if (!capitalStack.taxCreditTransferabilityReady) {
      score -= 6;
      reasons.push(
        "Tax credit transferability not ready (-6): Confirm transferability eligibility",
      );
    }
  } else {
    score -= 14;
    reasons.push("No capital stack defined (-14): Complete financial information");
  }

  // FEOC risk
  if (!project.feocAttested) {
    score -= 8;
    reasons.push(
      "FEOC attestation not provided (-8): Complete FEOC compliance attestation",
    );
    flags.feocRisk = true;
  }

  score = Math.max(0, score);

  // Fatal flag override: forces RED regardless of numeric score
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
```
