import type {
  AxisType,
  JoinedPlantRecord,
  PanelTechnology,
} from "../utils/types.js";
import { estimateTiltFromLatitude } from "../utils/geo.js";

export interface EffectiveParameters {
  tilt: number;
  azimuth: number;
  trackingBoost: number;
}

export function getEffectiveParameters(
  plant: Pick<
    JoinedPlantRecord,
    "axis_type" | "tilt_deg" | "azimuth_deg" | "latitude"
  >,
): EffectiveParameters {
  if (plant.axis_type === "Single Axis Tracking") {
    return { tilt: 0, azimuth: 180, trackingBoost: 1.15 };
  }
  if (plant.axis_type === "Dual Axis Tracking") {
    return { tilt: 0, azimuth: 180, trackingBoost: 1.25 };
  }
  return {
    tilt: plant.tilt_deg ?? estimateTiltFromLatitude(plant.latitude),
    azimuth: plant.azimuth_deg ?? 180,
    trackingBoost: 1.0,
  };
}

export function getModuleEfficiency(tech: PanelTechnology): number {
  switch (tech) {
    case "Crystalline Silicon":
      return 0.2;
    case "Thin Film":
      return 0.13;
    default:
      return 0.19;
  }
}

export function capacityBand(capacityMw: number): string {
  if (capacityMw < 2) return "1-2 MW";
  if (capacityMw < 5) return "2-5 MW";
  if (capacityMw < 10) return "5-10 MW";
  return "10-20 MW";
}

export function axisLabel(axis: AxisType): string {
  return axis;
}
