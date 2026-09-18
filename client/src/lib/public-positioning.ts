export const PUBLIC_POSITIONING =
  "EcoXchange is building distributed power infrastructure for data centers. We help operators and developers quantify flexible load, evaluate storage and distributed-generation options, understand tariff and interconnection constraints, connect operating data, verify performance, and build toward coordinated virtual-power-plant orchestration.";

export const POWER_FLEXIBILITY_PATHWAY = [
  "Map utility service, contracted capacity, and load constraints",
  "Quantify flexible MW and critical-load boundaries",
  "Evaluate storage, onsite generation, and distributed energy options",
  "Model tariff, interconnection, and market pathways",
  "Connect telemetry and verify performance",
  "Aggregate and orchestrate capacity as the fleet grows",
] as const;

export const ASSET_PATHWAY = [
  "Identify relevant distributed energy assets",
  "Assess financeability and capital requirements",
  "Connect telemetry and operating data",
  "Verify availability and performance",
  "Aggregate usable capacity around data-center demand",
] as const;

export const CAPITAL_FORMATION_PATHWAY = ASSET_PATHWAY;
export const BUYER_PATHWAY = POWER_FLEXIBILITY_PATHWAY;
