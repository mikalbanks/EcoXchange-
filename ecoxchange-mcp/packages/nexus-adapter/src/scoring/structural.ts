import { NEXUS_CONSTANTS } from "../utils/nexus_constants.js";

export interface StructuralDurability {
  score: number;
  factors: {
    regulatory_wrapper: string;
    compliance_enforced: string;
    custody_path: string;
    distribution_mechanism: string;
    data_transparency: string;
  };
  rationale: string;
}

export function scoreStructuralDurability(): StructuralDurability {
  // Structural durability is a constant of the EcoXchange issuance model:
  // every ESN ships with Reg D 506(c), ERC-3643 on-chain compliance,
  // Coinbase Base L2 custody, USDC smart-contract distributions, and
  // three-source verified production data. There's nothing project-specific
  // to vary today; if/when the platform offers alternative structures, this
  // function gains real branches.
  const score = Math.min(10, 5 + 1.5 + 1 + 1.5 + 1);
  return {
    score,
    factors: {
      regulatory_wrapper: NEXUS_CONSTANTS.regulatory_wrapper,
      compliance_enforced: NEXUS_CONSTANTS.compliance_enforced,
      custody_path: NEXUS_CONSTANTS.custody_path,
      distribution_mechanism: NEXUS_CONSTANTS.distribution_mechanism,
      data_transparency: NEXUS_CONSTANTS.data_transparency,
    },
    rationale:
      "Reg D 506(c) issuance, on-chain ERC-3643 transfer restrictions, Coinbase Base L2 custody, monthly USDC smart-contract distributions, and three-source verified production data.",
  };
}
