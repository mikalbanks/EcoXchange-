// Developer-facing Production Verification Report (4-page US Letter PDF).
// The pitch-meeting leave-behind: generated from the Run Demo backtest
// result, forwarded by the developer to their CFO/board. Rendered
// offscreen as .pdf-page divs and captured by the shared jsPDF +
// html2canvas pipeline (src/reports/pdf.ts, "letter" format).
//
// Distinct from VerificationReportTemplate.tsx, which is the investor-side
// A4 report on ProjectDetail — that stays untouched.

import type { VerificationReportModel } from "./report-utils/report-model.js";
import { ReportCoverPage } from "./report-pages/ReportCoverPage.js";
import { ReportProductionPage } from "./report-pages/ReportProductionPage.js";
import { ReportMethodologyPage } from "./report-pages/ReportMethodologyPage.js";
import { ReportCostPage } from "./report-pages/ReportCostPage.js";

const TOTAL_PAGES = 4;

export function VerificationReportDoc({
  model,
}: {
  model: VerificationReportModel;
}) {
  return (
    <>
      <ReportCoverPage model={model} page={1} total={TOTAL_PAGES} />
      <ReportProductionPage model={model} page={2} total={TOTAL_PAGES} />
      <ReportMethodologyPage model={model} page={3} total={TOTAL_PAGES} />
      <ReportCostPage model={model} page={4} total={TOTAL_PAGES} />
    </>
  );
}
