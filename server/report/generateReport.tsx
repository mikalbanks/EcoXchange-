/**
 * Entry point for generating the Production Verification Report PDF from a
 * completed backtest payload.
 */
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { BacktestCompletePayload } from "@shared/developer-backtest";
import { registerReportFonts } from "./fonts";
import { buildReportModel, type BuildReportOptions } from "./reportDataModel";
import { ReportDocument } from "./ReportDocument";

/** Render the report to a PDF Buffer. */
export async function renderReportPdf(
  payload: BacktestCompletePayload,
  options: BuildReportOptions = {},
): Promise<Buffer> {
  registerReportFonts();
  const model = buildReportModel(payload, options);
  return renderToBuffer(<ReportDocument model={model} />);
}

/** Slugify a project name for use in a download filename. */
function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "Project"
  );
}

/** Build the `EcoXchange_PVR_<Project>_<YYYY-MM-DD>.pdf` download filename. */
export function reportFilename(projectName: string, date = new Date()): string {
  const ymd = date.toISOString().slice(0, 10);
  return `EcoXchange_PVR_${slugify(projectName)}_${ymd}.pdf`;
}
