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
        EcoXchange's target verification architecture compares three
        independently sourced legs before an investor distribution is
        released:
      </p>

      <ReportThreeSourceDiagram />

      <p className="mt-4 text-[10.5px] leading-relaxed text-textDark">
        This report uses the satellite irradiance source (NASA POWER) to
        model expected generation. It does not establish independently sourced
        inverter or utility evidence unless those inputs are identified in the
        report. The planned live workflow adds the developer's inverter portal
        for gross production and a utility-meter connection for net export;
        satellite data supplies the physics-based benchmark.
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
