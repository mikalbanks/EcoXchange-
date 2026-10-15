export interface ScoutInputs {
  requiredMw: number;
  confirmedSupplyMw: number | null;
  isSupplyDocumented: boolean;
  utility: string;
  targetDate: string;
  siteStatus: string;
}

export interface ScoutCheck {
  label: string;
  status: "PROVIDED" | "TO_VERIFY";
  detail: string;
}

export interface ScoutScreen {
  bridgeMw: number | null;
  checks: ScoutCheck[];
  headline: string;
}

/**
 * This is an intake/readiness checklist, NOT an interconnection or feasibility study.
 * Only compute the arithmetic when the visitor explicitly reports documented, usable supply.
 * "Documented" is self-reported; EcoXchange has not reviewed the utility documents.
 */
export function screenSite(input: ScoutInputs): ScoutScreen {
  const validSupply = input.isSupplyDocumented
    && input.confirmedSupplyMw !== null
    && Number.isFinite(input.confirmedSupplyMw)
    && input.confirmedSupplyMw >= 0;
  const bridgeMw = validSupply && Number.isFinite(input.requiredMw) && input.requiredMw > 0
    ? Math.max(0, Math.round((input.requiredMw - input.confirmedSupplyMw!) * 1000) / 1000)
    : null;
  return {
    bridgeMw,
    headline: bridgeMw === null
      ? "Firm power availability is not yet established."
      : bridgeMw > 0
        ? "Your reported usable supply is below target load."
        : "Your reported usable supply meets the stated MW requirement.",
    checks: [
      {
        label: "Utility service territory",
        status: input.utility.trim() ? "PROVIDED" : "TO_VERIFY",
        detail: input.utility.trim()
          ? "Utility entered by visitor; territory and jurisdiction need independent confirmation."
          : "Identify the serving utility and request a formal large-load service discussion.",
      },
      {
        label: "Firm usable supply",
        status: validSupply ? "PROVIDED" : "TO_VERIFY",
        detail: validSupply
          ? "Documented supply is visitor-reported; verify MW, conditions, and when it becomes usable with the utility."
          : "Obtain utility-confirmed MW, in-service date, and any required upgrades. Proximity is not proof of capacity.",
      },
      {
        label: "Target commissioning",
        status: input.targetDate.trim() ? "PROVIDED" : "TO_VERIFY",
        detail: input.targetDate.trim()
          ? "Target timing entered by visitor, not a confirmed energization commitment."
          : "Establish a target opening and a phased MW ramp schedule.",
      },
      {
        label: "Site control and feasibility",
        status: input.siteStatus === "CONTROLLED" ? "PROVIDED" : "TO_VERIFY",
        detail: input.siteStatus === "CONTROLLED"
          ? "Site control was self-reported; assess zoning, land, water, fiber, and backup requirements."
          : "Confirm land, zoning, water/cooling, fiber, and construction constraints before committing.",
      },
    ],
  };
}
