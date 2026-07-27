// Page 3: how verification works + engine validation.

import type { VerificationReportModel } from "../report-utils/report-model.js";
import {
  ReportPage,
  ReportSectionHeader,
  ReportStatBand,
} from "../report-components/ReportChrome.js";
import { ReportThreeSourceDiagram } from "../report-components/ReportThreeSourceDiagram.js";

export function ReportMethodologyPage({
  model,
  page,
  total,
}: {
  model: VerificationReportModel;
  page: number;
  total: number;
}) {
  return (
    <ReportPage page={page} total={total}>
      <ReportSectionHeader>HOW VERIFICATION WORKS</ReportSectionHeader>
      <p className="mb-4 text-[10.5px] leading-relaxed text-textDark">
        EcoXchange's proprietary verification engine reconciles three
        independent data sources before any investor distribution is
        triggered:
      </p>

      <ReportThreeSourceDiagram />

      <p className="mt-4 text-[10.5px] leading-relaxed text-textDark">
        This report uses the satellite irradiance source (NASA POWER) to
        model expected generation. In live operation, all three sources are
        active: the developer's existing inverter monitoring portal provides
        gross production, the utility meter provides independent net export
        data via Bayou (66% U.S. meter coverage), and satellite data
        provides the physics-based benchmark. No on-site hardware is
        required.
      </p>

      <ReportSectionHeader>ENGINE VALIDATION</ReportSectionHeader>
      <ReportStatBand
        items={[
          {
            value: `${model.fleetSize.toLocaleString("en-US")}`,
            label: "EIA-923 plants",
          },
          {
            value: `±${model.publicationMadPct.toFixed(1)}%`,
            label: "MAD · publication cohort",
          },
          {
            value: `${model.publicationWithin10Pct.toFixed(1)}%`,
            label: "Within ±10%",
          },
        ]}
      />

      <p className="mt-4 text-[10.5px] leading-relaxed text-textDark">
        The verification engine ({model.engineVersion}) has been validated
        against the U.S. EIA-923 solar fleet. For plants in the 1–20 MW
        target segment, mean absolute deviation is ±
        {model.targetSegmentMadLow.toFixed(1)}–
        {model.targetSegmentMadHigh.toFixed(1)}%. Full methodology,
        including publication-cohort exclusion rules and full-fleet figures,
        at demo.ecoxchange.net/benchmark.
      </p>
    </ReportPage>
  );
}
