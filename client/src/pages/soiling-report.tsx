import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NotesPanel,
  Qualifier,
  ReportShell,
  formatUsd,
  primaryRow,
  useProjectAnalytics,
} from "@/components/analytics-report";
import type { PlantAnalyticsRow } from "@shared/plant-analytics";

/**
 * Soiling report (spec 22 §7.2) — loss in kWh and dollars, with the cleaning
 * interval implication.
 *
 * Two things this page refuses to do.
 *
 * It does not render "0% soiling" when SRR found no soiling signal. Those are
 * different claims: one says the panels are clean, the other says the method
 * could not find a soiling-and-recovery pattern in this record. §6.4 is explicit
 * that no soiling is a legitimate result for many sites and must not be forced.
 *
 * It does not show a dollar figure without saying where the PPA rate came from.
 * Every seeded system has a NULL rate — PVDAQ publishes no offtake terms — so
 * every dollar on this page is currently an estimate scaled from a stated
 * default, and it says so next to the number rather than in a footnote.
 */
export default function SoilingReportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading, error } = useProjectAnalytics(projectId);
  const row = primaryRow(data);

  return (
    <ReportShell
      title="Soiling Report"
      subtitle="Production lost to soiling, quantified and priced."
      project={data}
      isLoading={isLoading}
      error={error as Error | null}
    >
      {row ? <SoilingCard row={row} /> : null}
    </ReportShell>
  );
}

function SoilingCard({ row }: { row: PlantAnalyticsRow }) {
  const loss = row.soiling_loss_pct;
  const estimated = row.provenance?.ppa_rate_basis === "estimated";

  if (loss === null) {
    return (
      <Card className="border-border/50" data-testid="card-soiling">
        <CardHeader>
          <CardTitle>No soiling signal detected</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Qualifier>
            The stochastic rate-and-recovery analysis found no repeating
            soiling-and-cleaning pattern in this record. That is a completed
            analysis with a negative result, not a failed one — many sites
            genuinely have no measurable soiling, particularly in wet climates or
            without a nearby dust source.
          </Qualifier>
          <Qualifier tone="warning">
            This is not the same as "0% soiling loss". It means no soiling cycle
            was detectable at this site over this window. A slow, monotonic
            accumulation with no cleaning events would also be invisible to this
            method — it looks like degradation, not like soiling.
          </Qualifier>
          <NotesPanel
            notes={row.notes}
            match={(n) => n.toLowerCase().includes("soiling")}
            title="Detail"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50" data-testid="card-soiling">
      <CardHeader>
        <CardTitle>Measured soiling loss</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div data-testid="stat-soiling-loss">
          <p className="text-5xl font-bold tracking-tight">
            {loss.toFixed(2)}
            <span className="ml-2 text-2xl font-normal text-muted-foreground">
              %
            </span>
          </p>
          {row.soiling_ci_low !== null && row.soiling_ci_high !== null ? (
            <p
              className="mt-2 text-lg text-muted-foreground"
              data-testid="text-soiling-ci"
            >
              Confidence interval: {row.soiling_ci_low.toFixed(2)} to{" "}
              {row.soiling_ci_high.toFixed(2)} %
            </p>
          ) : null}
          {row.soiling_ratio !== null ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Insolation-weighted soiling ratio {row.soiling_ratio.toFixed(4)} —
              the plant delivers that fraction of what a clean array would.
            </p>
          ) : null}
        </div>

        <div
          className="rounded-lg border border-border/60 bg-muted/30 p-4"
          data-testid="stat-soiling-usd"
        >
          <p className="text-sm text-muted-foreground">Annual revenue impact</p>
          <p className="text-3xl font-semibold">
            {formatUsd(row.soiling_loss_usd)}
            {estimated ? (
              <span className="ml-2 align-middle text-sm font-normal text-amber-300">
                estimated
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {loss.toFixed(2)}% of{" "}
            {row.provenance?.expected_annual_kwh
              ? `${(row.provenance.expected_annual_kwh / 1_000_000).toFixed(2)} GWh/yr`
              : "annual production"}{" "}
            at ${row.ppa_rate_per_kwh?.toFixed(3)}/kWh.
          </p>
        </div>

        {estimated ? (
          <Qualifier tone="warning">
            This project carries no PPA rate, so the dollar figure uses a stated
            default of ${row.ppa_rate_per_kwh?.toFixed(3)}/kWh. It moves
            proportionally with the real rate — a third lower at $0.03/kWh, a
            third higher at $0.06/kWh. The percentage above is measured; only the
            translation into dollars is assumed.
          </Qualifier>
        ) : null}

        <CleaningImplication lossPct={loss} lossUsd={row.soiling_loss_usd} />

        <NotesPanel
          notes={row.notes}
          match={(n) => n.toLowerCase().includes("soiling")}
          title="Qualifications"
        />
      </CardContent>
    </Card>
  );
}

/**
 * What the loss implies for cleaning, stated as arithmetic the reader can check.
 *
 * Deliberately not a recommendation. Cleaning cost is site-specific — labour,
 * water access, array height, contract terms — and this module knows none of it.
 * What it can honestly supply is the annual figure a cleaning quote has to beat.
 */
function CleaningImplication({
  lossPct,
  lossUsd,
}: {
  lossPct: number;
  lossUsd: number | null;
}) {
  if (lossUsd === null) return null;
  return (
    <div className="rounded-lg border border-border/60 p-4 text-sm">
      <p className="font-medium text-foreground">Cleaning-interval implication</p>
      <p className="mt-1 leading-relaxed text-muted-foreground">
        Recovering this loss is worth up to {formatUsd(lossUsd)} a year, or about{" "}
        {formatUsd(lossUsd / 12)} a month of accrual. A cleaning programme costing
        less than that over a year pays for itself; one costing more does not.
        This deliberately stops short of a recommendation — cleaning cost depends
        on labour, water access and array geometry, none of which this analysis
        can see. What it gives you is the number a quote has to beat.
      </p>
    </div>
  );
}
