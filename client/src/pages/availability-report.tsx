import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  NotesPanel,
  Qualifier,
  ReportShell,
  formatKwh,
  formatUsd,
  primaryRow,
  useProjectAnalytics,
} from "@/components/analytics-report";
import type { PlantAnalyticsRow } from "@shared/plant-analytics";

/**
 * Availability report (spec 22 §7.3) — uptime and lost production, with genuine
 * outages separated from datalogger dropouts.
 *
 * That separation is the whole product. A monthly kWh total cannot tell a plant
 * that stopped producing from a plant whose telemetry link went down, and the
 * reconciliation engine flags both identically. RdTools distinguishes them by
 * checking whether cumulative metered energy advanced across the gap.
 *
 * Which means the distinction is only as good as the meter behind it — and most
 * PVDAQ systems publish no cumulative channel, so the engine integrates one from
 * the same power series that goes flat during a dropout. When that happens the
 * separation degrades to guesswork, availability becomes a lower bound, and this
 * page says so at the top rather than at the bottom.
 */
export default function AvailabilityReportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading, error } = useProjectAnalytics(projectId);
  const row = primaryRow(data);

  return (
    <ReportShell
      title="Availability Report"
      subtitle="Uptime and lost production, with real outages separated from comms dropouts."
      project={data}
      isLoading={isLoading}
      error={error as Error | null}
    >
      {row ? <AvailabilityCard row={row} /> : null}
      {row ? <MonthlyChart row={row} /> : null}
    </ReportShell>
  );
}

function AvailabilityCard({ row }: { row: PlantAnalyticsRow }) {
  const derived = row.provenance?.availability_basis === "derived_from_power";
  const subsystems = row.provenance?.availability_subsystems ?? 1;
  const estimated = row.provenance?.ppa_rate_basis === "estimated";

  if (row.availability_pct === null) {
    return (
      <Card className="border-border/50" data-testid="card-availability">
        <CardHeader>
          <CardTitle>No availability figure for this window</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Qualifier>
            The availability analysis did not complete. That is a gap in the
            measurement, not a statement about the plant's uptime.
          </Qualifier>
          <NotesPanel
            notes={row.notes}
            match={(n) => n.toLowerCase().includes("availability")}
            title="Why"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50" data-testid="card-availability">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle>Measured availability</CardTitle>
        {derived ? (
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-300"
            data-testid="badge-derived-basis"
          >
            Lower bound
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            data-testid="badge-metered-basis"
          >
            Meter-backed
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div data-testid="stat-availability">
          <p className="text-5xl font-bold tracking-tight">
            {row.availability_pct.toFixed(2)}
            <span className="ml-2 text-2xl font-normal text-muted-foreground">
              %
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Across {subsystems === 1 ? "the site total" : `${subsystems} inverters`},
            over {row.n_days_analyzed.toLocaleString()} days.
          </p>
        </div>

        {/* The caveat sits directly under the number it qualifies, above the
            dollar figures — a reader who stops after the headline should
            already have met it. */}
        {derived ? (
          <Qualifier tone="warning">
            This system publishes no cumulative meter channel, so cumulative
            energy was integrated from the same AC power series the analysis is
            testing. That series is blank during a communications dropout, so the
            derived total does not advance across one either — which is exactly
            the signal used to tell a comms interruption from a real outage.
            Genuine outages and telemetry gaps are therefore <strong>not
            reliably separated here</strong>, and the figure above should be read
            as a lower bound on true availability.
          </Qualifier>
        ) : (
          <Qualifier>
            Backed by the system's own revenue-meter channel, which keeps
            counting while the telemetry link is down. That is what makes the
            comms-versus-outage distinction below trustworthy.
          </Qualifier>
        )}

        {subsystems === 1 ? (
          <Qualifier tone="warning">
            Only one power channel was available, so a partial outage — one
            inverter down while the others produce — is invisible except as a
            shortfall against expectation. Attributing a loss to a specific
            subsystem needs per-inverter telemetry.
          </Qualifier>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Lost production"
            value={formatKwh(row.lost_production_kwh)}
            testId="stat-lost-production"
          />
          <Stat
            label="Genuine outages"
            value={row.outage_count === null ? "—" : String(row.outage_count)}
            testId="stat-outage-count"
          />
          <Stat
            label="Revenue impact"
            value={formatUsd(row.availability_loss_usd)}
            suffix={estimated ? "estimated" : undefined}
            testId="stat-availability-usd"
          />
        </div>

        {estimated ? (
          <Qualifier tone="warning">
            No PPA rate on this project, so the revenue figure uses a stated
            default of ${row.ppa_rate_per_kwh?.toFixed(3)}/kWh. The lost-kWh
            figure is measured; only its translation into dollars is assumed.
          </Qualifier>
        ) : null}

        <NotesPanel
          notes={row.notes}
          match={(n) =>
            n.toLowerCase().includes("outage") ||
            n.toLowerCase().includes("subsystem") ||
            n.toLowerCase().includes("cumulative")
          }
          title="Qualifications"
        />
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  suffix,
  testId,
}: {
  label: string;
  value: string;
  suffix?: string;
  testId: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold" data-testid={testId}>
        {value}
        {suffix ? (
          <span className="ml-2 align-middle text-xs font-normal text-amber-300">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function MonthlyChart({ row }: { row: PlantAnalyticsRow }) {
  const monthly = row.provenance?.availability_monthly ?? [];
  if (monthly.length === 0) return null;

  const data = monthly.map((m) => ({
    period: m.period,
    availability: m.availability_pct,
    lost: m.lost_production_kwh,
  }));

  return (
    <Card className="border-border/50" data-testid="card-availability-monthly">
      <CardHeader>
        <CardTitle className="text-base">Month by month</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full" data-testid="chart-availability-monthly">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="period"
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                interval="preserveStartEnd"
              />
              {/* Not zero-based on purpose: availability lives in the top few
                  percent, and a 0-100 axis flattens every month into the same
                  bar. The axis label says where it starts. */}
              <YAxis
                domain={[90, 100]}
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(v: number) => `${v?.toFixed(2)}%`}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Bar dataKey="availability" fill="#34d399" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Axis starts at 90% — availability varies in the top few percent, and a
          full 0–100% scale renders every month as an identical bar. Months below
          90% are clipped at the axis floor.
        </p>
      </CardContent>
    </Card>
  );
}
