import verifiedData from "./demo-savannah.json";
import flaggedData from "./demo-savannah-flagged.json";
import type { DemoMode, ProjectBundle, VerificationRecord } from "./types.js";

const verified = verifiedData as ProjectBundle;
const flagged = flaggedData as ProjectBundle;

export interface PortfolioCard {
  project: ProjectBundle["project"];
  summary: ProjectBundle["summary"];
  latest_record: VerificationRecord;
  months_verified: number;
  months_flagged: number;
}

export function loadBundle(mode: DemoMode): ProjectBundle {
  return mode === "flagged" ? flagged : verified;
}

export function loadPortfolio(mode: DemoMode): PortfolioCard[] {
  const bundle = loadBundle(mode);
  const records = bundle.verification_records;
  const months_verified = records.filter((r) => r.status === "verified").length;
  const months_flagged = records.filter((r) => r.status === "flagged").length;
  return [
    {
      project: bundle.project,
      summary: bundle.summary,
      latest_record: records[records.length - 1]!,
      months_verified,
      months_flagged,
    },
  ];
}

export function loadProject(id: string, mode: DemoMode): ProjectBundle | null {
  const bundle = loadBundle(mode);
  return bundle.project.id === id ? bundle : null;
}

export function loadVerification(
  projectId: string,
  periodStart: string,
  mode: DemoMode,
): { project: ProjectBundle["project"]; record: VerificationRecord } | null {
  const bundle = loadProject(projectId, mode);
  if (!bundle) return null;
  const record = bundle.verification_records.find(
    (r) => r.period_start === periodStart,
  );
  if (!record) return null;
  return { project: bundle.project, record };
}
