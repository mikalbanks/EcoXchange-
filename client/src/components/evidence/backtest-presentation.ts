export type SatelliteSource =
  | "SOLCAST_HISTORICAL"
  | "SOLCAST_ESTIMATED_ACTUALS"
  | "SYNTHETIC_FALLBACK";

export function describeSatelliteSource(source: SatelliteSource | string) {
  if (source === "SOLCAST_HISTORICAL") {
    return {
      displayLabel: "Solcast Historical (Coverage Unreported)",
      badgeLabel: "Solcast Historical, Coverage Unreported",
      seriesLabel: "Satellite Estimate (Solcast Historical)",
      methodology: "Satellite estimates sourced from Solcast historical period data",
      documentation: "Solcast Historical API (historical irradiance and production model).",
    };
  }
  if (source === "SOLCAST_ESTIMATED_ACTUALS") {
    return {
      displayLabel: "Solcast Estimated Actuals (Coverage Unreported)",
      badgeLabel: "Solcast Estimated Actuals, Coverage Unreported",
      seriesLabel: "Satellite Estimate (Solcast Estimated Actuals)",
      methodology: "Satellite estimates sourced from Solcast estimated actuals period data",
      documentation: "Solcast Estimated Actuals API (satellite-derived irradiance estimate).",
    };
  }
  if (source !== "SYNTHETIC_FALLBACK") {
    return {
      displayLabel: "Unknown Comparison Source",
      badgeLabel: "Unknown Comparison Source",
      seriesLabel: "Unclassified Comparison Series",
      methodology: "Comparison source is not recognized by this client",
      documentation: "The API returned an unrecognized source value; no independent-source claim is made.",
    };
  }
  return {
    displayLabel: "Irradiance-Model Fallback",
    badgeLabel: "Irradiance-Model Fallback",
    seriesLabel: "Modeled Irradiance Fallback",
    methodology: "Comparison series derived from the configured irradiance-model fallback",
    documentation: "Modeled irradiance fallback used where the direct historical endpoint is unavailable.",
  };
}

interface MeterPresentationInput {
  meterDataSource?: "synthetic" | "stored";
  site: {
    siteId: string;
    siteName: string;
  };
}

export function describeMeterPresentation(report: MeterPresentationInput) {
  if (report.meterDataSource === "stored") {
    return {
      seriesLabel: "Stored Production Records (Origin Unstated)",
      siteIdentifier: `${report.site.siteName} (${report.site.siteId})`,
      methodology: `Production data loaded from stored records (site label ${report.site.siteId}); ingestion origin and utility provenance are not encoded`,
    };
  }
  return {
    seriesLabel: "Synthesized Meter Baseline",
    siteIdentifier: report.site.siteId === "9068"
      ? `PVDAQ ${report.site.siteId}`
      : `${report.site.siteName} (${report.site.siteId})`,
    methodology: `Meter baseline synthesized from site label ${report.site.siteId} specifications (capacity, array type, location)`,
  };
}
