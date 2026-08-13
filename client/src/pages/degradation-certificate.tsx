import { useParams } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  NotesPanel,
  Qualifier,
  ReportShell,
  primaryRow,
  useProjectAnalytics,
} from "@/components/analytics-report";
import type { PlantAnalyticsRow } from "@shared/plant-analytics";

/**
 * Degradation certificate (spec 22 §7.1) — for warranty claims and refinance
 * diligence.
 *
 * The whole document is built around one rule: **the rate and its confidence
 * interval are one thing.** They render together, they are never separated by a
 * layout, and when the interval is missing the rate is not shown at all. A
 * degradation rate quoted without error bars reads as more certain than one
 * quoted with them, which is precisely backwards, and this is the number most
 * likely to be lifted out of context and put in front of a warranty adjuster.
 */
export default function DegradationCertificatePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading, error } = useProjectAnalytics(projectId);
  const row = primaryRow(data);
  const sensorRow = data?.rows.find((r) => r.degradation_method === "sensor");

  return (
    <ReportShell
      title="Degradation Certificate"
      subtitle="Measured year-on-year performance loss, with its uncertainty band."
      project={data}
      isLoading={isLoading}
      error={error as Error | null}
    >
      {row ? <RateCard row={row} sensorRow={sensorRow} /> : null}
      {row ? <MethodComparison row={row} sensorRow={sensorRow} /> : null}
    </ReportShell>
  );
}

function RateCard({
  row,
  sensorRow,
}: {
  row: PlantAnalyticsRow;
  sensorRow?: PlantAnalyticsRow;
}) {
  const rate = row.degradation_pct_per_yr;
  const low = row.degradation_ci_low;
  const high = row.degradation_ci_high;
  const inBand = row.provenance?.degradation_within_plausible_range;

  if (rate === null) {
    return (
      <Card className="border-border/50" data-testid="card-degradation-rate">
        <CardHeader>
          <CardTitle>No degradation rate for this window</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Qualifier>
            Year-on-year analysis compares each day to the same day a year
            earlier. Below 24 months of usable record there is no second year to
            compare most of the first against, so no rate is reported. A point
            estimate here would be fabricated rather than conservative — this is
            a stated absence, not a failed measurement.
          </Qualifier>
          <NotesPanel
            notes={row.notes}
            match={(n) => n.startsWith("No degradation rate")}
            title="Why"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50" data-testid="card-degradation-rate">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle>Measured degradation</CardTitle>
        {inBand === false ? (
          <Badge
            variant="outline"
            className="border-amber-500/60 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-300"
            data-testid="badge-outside-band"
          >
            Outside typical range
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Rate and interval in one block. Not two stats side by side — a
            layout that can be cropped to just the rate is a layout that will
            be. */}
        <div data-testid="stat-degradation-rate">
          <p className="text-5xl font-bold tracking-tight">
            {rate.toFixed(2)}
            <span className="ml-2 text-2xl font-normal text-muted-foreground">
              %/yr
            </span>
          </p>
          {low !== null && high !== null ? (
            <p
              className="mt-2 text-lg text-muted-foreground"
              data-testid="text-degradation-ci"
            >
              95% confidence interval: {low.toFixed(2)} to {high.toFixed(2)} %/yr
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">
            Normalized against{" "}
            {row.degradation_method === "clearsky"
              ? "modeled clear-sky irradiance"
              : "the site's own plane-of-array sensor"}
            , over {row.n_days_analyzed.toLocaleString()} days of filtered data.
          </p>
        </div>

        <IntervalBar rate={rate} low={low} high={high} />

        {/* An interval spanning zero is the most important thing on this page,
            so it sits above the general explanation rather than below it. */}
        {low !== null && high !== null && low < 0 && high > 0 ? (
          <Qualifier tone="warning">
            <strong>This analysis did not establish that the plant is
            degrading.</strong> The 95% interval runs from {low.toFixed(2)} to{" "}
            {high.toFixed(2)} %/yr and includes zero, so the record is equally
            consistent with no degradation at all. The {rate.toFixed(2)} %/yr
            figure is the centre of that range and should not be quoted on its
            own — the honest summary is that the available record is too short
            or too noisy to resolve a trend of this size.
          </Qualifier>
        ) : (
          <Qualifier>
            The interval is the finding as much as the rate is. A central
            estimate of {rate.toFixed(2)} %/yr with a band from{" "}
            {low?.toFixed(2)} to {high?.toFixed(2)} says the data is consistent
            with any rate in that range — quoting the midpoint alone overstates
            what was measured.
          </Qualifier>
        )}

        {inBand === false ? (
          <Qualifier tone="warning">
            This rate falls outside the −0.2 to −2.5 %/yr band typical of
            crystalline silicon. It is reported as measured rather than adjusted
            into range. Read it together with the site notes below: for these
            systems the published record carries documented issues that a
            degradation analysis cannot separate from genuine module wear.
          </Qualifier>
        ) : null}

        {/* `NOT DISTINGUISHABLE FROM ZERO` and `Rate of ... falls outside` are
            deliberately excluded: both are already rendered above as their own
            callouts, and repeating them here trains the reader to skim the
            qualifications block — which is where the site-specific caveats
            live. */}
        <NotesPanel
          notes={row.notes}
          match={(n) =>
            n.startsWith("Site caveat:") ||
            n.startsWith("WIDE INTERVAL:") ||
            n.startsWith("This system publishes no plane-of-array")
          }
          title="Qualifications"
        />
      </CardContent>
    </Card>
  );
}

/** A visual for the interval, so its width is legible at a glance. */
function IntervalBar({
  rate,
  low,
  high,
}: {
  rate: number;
  low: number | null;
  high: number | null;
}) {
  if (low === null || high === null) return null;
  const pad = Math.max((high - low) * 0.6, 0.3);
  const min = low - pad;
  const max = high + pad;
  const data = [
    { x: min, y: 0 },
    { x: max, y: 0 },
  ];
  return (
    <div className="h-24 w-full" data-testid="chart-degradation-interval">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 16, bottom: 8, left: 16 }}>
          <XAxis
            type="number"
            dataKey="x"
            domain={[min, max]}
            tickFormatter={(v: number) => `${v.toFixed(1)}`}
            stroke="currentColor"
            className="text-xs text-muted-foreground"
          />
          <YAxis hide domain={[-1, 1]} />
          <ReferenceArea
            x1={low}
            x2={high}
            y1={-1}
            y2={1}
            fill="#34d399"
            fillOpacity={0.18}
          />
          <ReferenceArea
            x1={rate - (max - min) * 0.004}
            x2={rate + (max - min) * 0.004}
            y1={-1}
            y2={1}
            fill="#34d399"
            fillOpacity={0.95}
          />
          <Tooltip
            formatter={(v: number) => `${v.toFixed(2)} %/yr`}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          />
          <Line dataKey="y" stroke="transparent" dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-center text-xs text-muted-foreground">
        Shaded band: the 95% confidence interval. Solid mark: the median estimate.
      </p>
    </div>
  );
}

/**
 * Where both methods ran, the gap between them is its own finding (§2.2).
 *
 * Never averaged. A clear-sky rate and a sensor rate that disagree by more than
 * 0.5 %/yr usually mean the pyranometer has drifted, and averaging them buries
 * the only evidence of that.
 */
function MethodComparison({
  row,
  sensorRow,
}: {
  row: PlantAnalyticsRow;
  sensorRow?: PlantAnalyticsRow;
}) {
  if (!sensorRow) {
    return (
      <Card className="border-border/50" data-testid="card-method-comparison">
        <CardHeader>
          <CardTitle className="text-base">Single-method analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Qualifier>
            Only the clear-sky method ran. This system publishes no verified
            plane-of-array irradiance channel, so there is no independent sensor
            analysis to cross-check against. Clear-sky is the stronger default
            regardless: it normalizes against modeled irradiance and so cannot be
            fooled by a drifting site pyranometer.
          </Qualifier>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50" data-testid="card-method-comparison">
      <CardHeader>
        <CardTitle className="text-base">Clear-sky vs sensor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Clear-sky</dt>
            <dd className="text-2xl font-semibold" data-testid="stat-clearsky-rate">
              {row.degradation_pct_per_yr?.toFixed(2) ?? "—"} %/yr
            </dd>
            <dd className="text-sm text-muted-foreground">
              {row.degradation_ci_low?.toFixed(2)} to{" "}
              {row.degradation_ci_high?.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Sensor</dt>
            <dd className="text-2xl font-semibold" data-testid="stat-sensor-rate">
              {sensorRow.degradation_pct_per_yr?.toFixed(2) ?? "—"} %/yr
            </dd>
            <dd className="text-sm text-muted-foreground">
              {sensorRow.degradation_ci_low?.toFixed(2)} to{" "}
              {sensorRow.degradation_ci_high?.toFixed(2)}
            </dd>
          </div>
        </dl>
        <NotesPanel
          notes={row.notes}
          match={(n) =>
            n.startsWith("DISAGREEMENT:") || n.startsWith("Clear-sky and sensor")
          }
          title="What the comparison shows"
        />
      </CardContent>
    </Card>
  );
}
