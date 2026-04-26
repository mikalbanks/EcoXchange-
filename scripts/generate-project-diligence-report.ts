import { storage } from "../server/storage";

type Confidence = "HIGH" | "MEDIUM" | "LOW";

interface DiligenceAssessment {
  projectId: string;
  projectName: string;
  capacityMw: number;
  coordinates: {
    latitude: number | null;
    longitude: number | null;
    quality: "VALID_CA" | "VALID_US_NON_CA" | "INVALID_OR_MISSING";
  };
  leaseSignal: {
    siteControlStatus: string;
    score: number;
    confidence: Confidence;
  };
  projectMaturitySignal: {
    stage: string;
    permittingStatus: string;
    interconnectionStatus: string;
    score: number;
    confidence: Confidence;
  };
  estimatedSolarResource: {
    band: "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
    estimatedAnnualCapacityFactorPct: number | null;
    note: string;
  };
  overallRealityLikelihood: Confidence;
  dueDiligenceChecklist: string[];
}

function parseMaybeNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function assessCoordinateQuality(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return "INVALID_OR_MISSING" as const;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return "INVALID_OR_MISSING" as const;
  }

  const inUs = latitude >= 24 && latitude <= 49.5 && longitude >= -125 && longitude <= -66;
  if (!inUs) return "INVALID_OR_MISSING" as const;

  const inCalifornia = latitude >= 32.4 && latitude <= 42.1 && longitude >= -124.6 && longitude <= -114.1;
  return inCalifornia ? "VALID_CA" : "VALID_US_NON_CA";
}

function leaseSignalScore(siteControlStatus: string | null): number {
  const status = (siteControlStatus || "NONE").toUpperCase();
  if (status === "OWNED") return 4;
  if (status === "LEASE") return 3;
  if (status === "OPTION") return 2;
  if (status === "LOI") return 1;
  return 0;
}

function maturitySignalScore(stage: string | null, permittingStatus: string | null, interconnectionStatus: string | null): number {
  let score = 0;
  const st = (stage || "PRE_NTP").toUpperCase();
  const permit = (permittingStatus || "UNKNOWN").toUpperCase();
  const interconnect = (interconnectionStatus || "UNKNOWN").toUpperCase();

  if (st === "COD") score += 3;
  else if (st === "CONSTRUCTION") score += 2;
  else if (st === "NTP") score += 1;

  if (permit === "APPROVED") score += 2;
  else if (permit === "IN_PROGRESS" || permit === "SUBMITTED") score += 1;

  if (interconnect === "IA_EXECUTED" || interconnect === "READY_TO_BUILD") score += 2;
  else if (interconnect === "APPLIED" || interconnect === "STUDY") score += 1;

  return score;
}

function scoreToConfidence(score: number, highMin: number, medMin: number): Confidence {
  if (score >= highMin) return "HIGH";
  if (score >= medMin) return "MEDIUM";
  return "LOW";
}

function estimateSolarResource(latitude: number | null, coordinateQuality: ReturnType<typeof assessCoordinateQuality>) {
  if (latitude === null || coordinateQuality === "INVALID_OR_MISSING") {
    return {
      band: "UNKNOWN" as const,
      estimatedAnnualCapacityFactorPct: null,
      note: "Missing or invalid coordinates prevent resource estimation.",
    };
  }

  // Coarse CA/US latitude heuristic for PV annual CF (planning-level only).
  const baseline = latitude <= 35 ? 24 : latitude <= 38 ? 22 : 20;
  const adjustment = coordinateQuality === "VALID_CA" ? 0 : -2;
  const capacityFactor = Math.max(14, Math.min(28, baseline + adjustment));
  const band = capacityFactor >= 23 ? "HIGH" : capacityFactor >= 20 ? "MODERATE" : "LOW";

  return {
    band: band as "HIGH" | "MODERATE" | "LOW",
    estimatedAnnualCapacityFactorPct: capacityFactor,
    note: "Estimated from latitude band only; replace with NSRDB/PVWatts or measured SCADA for underwriting.",
  };
}

function buildChecklist(
  coordinateQuality: ReturnType<typeof assessCoordinateQuality>,
  siteControlStatus: string | null,
): string[] {
  const list = [
    "Verify APN/parcel boundary against county GIS and title report.",
    "Obtain executed lease/option or deed + memorandum (recorded, if available).",
    "Confirm interconnection queue position and latest utility study package.",
    "Confirm permit package status with county/state agency references.",
    "Obtain utility bill/SCADA history or independent energy model (NSRDB/PVWatts) for production underwriting.",
  ];

  if (coordinateQuality !== "VALID_CA") {
    list.unshift("Coordinate verification required: listing coordinates are missing/invalid or not clearly in California.");
  }

  const control = (siteControlStatus || "NONE").toUpperCase();
  if (control === "NONE" || control === "LOI") {
    list.unshift("Land control is preliminary (LOI/NONE); require legally binding option/lease before investment committee approval.");
  }

  return list;
}

async function run() {
  const approved = await storage.getProjectsByStatus("APPROVED");
  const institutional = approved.filter((project) => Number(project.capacityMW || 0) >= 1);

  const report: DiligenceAssessment[] = institutional.map((project) => {
    const latitude = parseMaybeNumber(project.latitude);
    const longitude = parseMaybeNumber(project.longitude);
    const capacityMw = parseMaybeNumber(project.capacityMW) || 0;

    const coordinateQuality = assessCoordinateQuality(latitude, longitude);
    const leaseScore = leaseSignalScore(project.siteControlStatus);
    const maturityScore = maturitySignalScore(project.stage, project.permittingStatus, project.interconnectionStatus);
    const leaseConfidence = scoreToConfidence(leaseScore, 3, 2);
    const maturityConfidence = scoreToConfidence(maturityScore, 5, 3);

    const coordinateConfidence: Confidence =
      coordinateQuality === "VALID_CA" ? "HIGH" : coordinateQuality === "VALID_US_NON_CA" ? "MEDIUM" : "LOW";

    const combinedScore =
      (coordinateConfidence === "HIGH" ? 3 : coordinateConfidence === "MEDIUM" ? 2 : 1) +
      (leaseConfidence === "HIGH" ? 3 : leaseConfidence === "MEDIUM" ? 2 : 1) +
      (maturityConfidence === "HIGH" ? 3 : maturityConfidence === "MEDIUM" ? 2 : 1);

    const overallRealityLikelihood: Confidence = combinedScore >= 8 ? "HIGH" : combinedScore >= 6 ? "MEDIUM" : "LOW";
    const resource = estimateSolarResource(latitude, coordinateQuality);

    return {
      projectId: project.id,
      projectName: project.name,
      capacityMw,
      coordinates: {
        latitude,
        longitude,
        quality: coordinateQuality,
      },
      leaseSignal: {
        siteControlStatus: project.siteControlStatus || "UNKNOWN",
        score: leaseScore,
        confidence: leaseConfidence,
      },
      projectMaturitySignal: {
        stage: project.stage || "UNKNOWN",
        permittingStatus: project.permittingStatus || "UNKNOWN",
        interconnectionStatus: project.interconnectionStatus || "UNKNOWN",
        score: maturityScore,
        confidence: maturityConfidence,
      },
      estimatedSolarResource: resource,
      overallRealityLikelihood,
      dueDiligenceChecklist: buildChecklist(coordinateQuality, project.siteControlStatus),
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    scope: "Approved projects with capacityMW >= 1",
    projectCount: report.length,
    byLikelihood: {
      high: report.filter((r) => r.overallRealityLikelihood === "HIGH").length,
      medium: report.filter((r) => r.overallRealityLikelihood === "MEDIUM").length,
      low: report.filter((r) => r.overallRealityLikelihood === "LOW").length,
    },
  };

  console.log(JSON.stringify({ summary, projects: report }, null, 2));
}

run().catch((error) => {
  console.error("Failed to generate project diligence report:", error);
  process.exitCode = 1;
});
