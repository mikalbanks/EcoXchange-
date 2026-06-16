// EPA Greenhouse Gas Equivalencies (Spec 08).
// Source: https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator

export const EPA_CONSTANTS = {
  // U.S. national average grid emission factor (eGRID 2022)
  // 0.000417 metric tons CO2 per kWh = 0.417 kg CO2 per kWh
  CO2_KG_PER_KWH: 0.417,

  // Regional eGRID emission factors (kg CO2 per kWh)
  EGRID_REGIONS: {
    SRSO: 0.391, // SERC South (Georgia, Alabama)
    NEWE: 0.226, // New England (Massachusetts)
    AZNM: 0.401, // Arizona / New Mexico
    CAMX: 0.206, // California
    RFCW: 0.513, // RFC West (Ohio, Indiana)
    RFCE: 0.296, // RFC East (NJ, PA, MD, VA)
    SRMW: 0.66, // SERC Midwest
    NYLI: 0.249, // New York Long Island
    RMPA: 0.554, // Rocky Mountain
    SPSO: 0.434, // SPP South
    ERCT: 0.379, // Texas (ERCOT)
    FRCC: 0.37, // Florida
    SRVC: 0.317, // SERC Virginia/Carolina
  } as Record<string, number>,

  // EPA equivalency factors
  KWH_PER_HOME_YEAR: 10_500, // Average U.S. household annual consumption
  CO2_METRIC_TONS_PER_TREE_YEAR: 0.06, // Medium growth, 10-year average
  KWH_PER_SMARTPHONE_CHARGE: 0.012, // Per full charge
  CO2_KG_PER_GALLON_GAS: 8.887, // Per gallon of gasoline
  CO2_KG_PER_MILE_DRIVEN: 0.398, // Average passenger vehicle
  CO2_METRIC_TONS_PER_ACRE_FOREST_YEAR: 0.84,
};

// State code to eGRID subregion mapping (simplified for MVP)
export const STATE_TO_EGRID: Record<string, string> = {
  GA: "SRSO", AL: "SRSO", SC: "SRSO", MS: "SRSO",
  MA: "NEWE", CT: "NEWE", ME: "NEWE", NH: "NEWE", RI: "NEWE", VT: "NEWE",
  AZ: "AZNM", NM: "AZNM",
  CA: "CAMX",
  OH: "RFCW", IN: "RFCW", WV: "RFCW",
  NJ: "RFCE", PA: "RFCE", MD: "RFCE", DE: "RFCE", DC: "RFCE", VA: "RFCE",
  NY: "NYLI",
  TX: "ERCT",
  CO: "RMPA", WY: "RMPA", MT: "RMPA",
  IL: "SRMW", MO: "SRMW", WI: "SRMW",
  FL: "FRCC",
  NC: "SRVC", TN: "SRVC",
};
