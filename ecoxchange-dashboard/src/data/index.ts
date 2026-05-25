import demoPortfolio from "./demo-portfolio.json";
import demoSavannah from "./demo-savannah.json";
import demoSavannahFlagged from "./demo-savannah-flagged.json";
import type { Portfolio, ProjectBundle, VerificationRecord } from "../utils/types.js";

const portfolio = demoPortfolio as Portfolio;
const verified = demoSavannah as ProjectBundle;
const flagged = demoSavannahFlagged as ProjectBundle;

export interface LoadOptions {
  variant?: "verified" | "flagged";
}

export async function loadPortfolio(): Promise<Portfolio> {
  return portfolio;
}

export async function loadProject(
  id: string,
  opts: LoadOptions = {},
): Promise<ProjectBundle | null> {
  if (id !== "demo-savannah-5mw") return null;
  return opts.variant === "flagged" ? flagged : verified;
}

export async function loadVerification(
  id: string,
  period: string,
  opts: LoadOptions = {},
): Promise<{ project: ProjectBundle["project"]; record: VerificationRecord } | null> {
  const bundle = await loadProject(id, opts);
  if (!bundle) return null;
  const record = bundle.verification_records.find((r) => r.period_start === period);
  if (!record) return null;
  return { project: bundle.project, record };
}
