import React from "react";
import { Document } from "@react-pdf/renderer";
import type { ReportModel } from "./reportDataModel";
import { CoverPage } from "./pages/CoverPage";
import { ExecutiveSummary } from "./pages/ExecutiveSummary";
import { MonthlyAnalysis } from "./pages/MonthlyAnalysis";
import { SeasonalAnalysis } from "./pages/SeasonalAnalysis";
import { RevenueEstimate } from "./pages/RevenueEstimate";
import { Methodology } from "./pages/Methodology";

/**
 * Production Verification Report document. The Revenue page is conditional on a
 * PPA rate being present (model.includeRevenue).
 */
export function ReportDocument({ model }: { model: ReportModel }) {
  return (
    <Document
      title={`EcoXchange Production Verification Report — ${model.projectName}`}
      author="EcoXchange, Inc."
      subject="Production Verification Report"
      creator="ecoxchange-pvlib-service v1.0.0"
    >
      <CoverPage model={model} />
      <ExecutiveSummary model={model} />
      <MonthlyAnalysis model={model} />
      <SeasonalAnalysis model={model} />
      {model.includeRevenue && <RevenueEstimate model={model} />}
      <Methodology model={model} />
    </Document>
  );
}
