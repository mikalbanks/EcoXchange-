import type { OfftakeType } from "../db/types.js";

export const NEXUS_CONSTANTS = {
  asset_class: "infrastructure_solar" as const,
  income_mechanism: "stablecoin_scheduled" as const,
  liquidity_profile: "illiquid_ats_planned" as const,
  inflation_linkage: "ppa_escalator" as const,
  physical_backing: true as const,
  verified_production_data: true as const,
  regulatory_wrapper: "reg_d_506c" as const,
  custody_path: "coinbase_base_l2" as const,
  distribution_frequency: "monthly" as const,
  distribution_currency: "USDC" as const,
  distribution_mechanism: "smart_contract" as const,
  compliance_enforced: "on_chain_erc3643" as const,
  data_transparency: "three_source_verified" as const,
};

export function counterpartyTypeFor(offtake: OfftakeType | null): string {
  switch (offtake) {
    case "ppa":
      return "utility_ig";
    case "community_solar":
      return "aggregator";
    case "net_metering":
      return "utility";
    case "merchant":
      return "merchant";
    default:
      return "unknown";
  }
}

export function subClassFor(offtake: OfftakeType | null): string {
  switch (offtake) {
    case "ppa":
      return "ppa";
    case "community_solar":
      return "community_solar";
    case "net_metering":
      return "net_metering";
    case "merchant":
      return "commercial";
    default:
      return "unknown";
  }
}

export const ENGINE_VERSION = "0.1.0";
