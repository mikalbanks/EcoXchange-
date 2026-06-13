import { useState } from "react";
import {
  Zap,
  Gauge,
  CalendarDays,
  ShieldCheck,
  ChevronDown,
  CalendarClock,
  TrendingUp,
} from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductionChart } from "@/components/shared/production-chart";
import { VerificationTimeline } from "@/components/shared/verification-timeline";
import { CapacityFactorChart } from "@/components/shared/capacity-factor-chart";
import { TemperatureChart } from "@/components/developer/temperature-chart";
import { MethodologyNote } from "@/components/shared/methodology-note";
import { ReportDownloadButton } from "@/components/developer/report-download-button";
import { monthLabelLong, formatMwh, formatUsd } from "@/lib/backtest-format";
import type { BacktestCompletePayload } from "@shared/developer-backtest";

interface BacktestResultsProps {
  result: BacktestCompletePayload;
}

export function BacktestResults({ result }: BacktestResultsProps) {
  const { summary, monthly_results: months, project } = result;
  const [showConfig, setShowConfig] = useState(false);
  const monthsTested = summary.months_verified + summary.months_flagged;

  return (
    <div className="space-y-6" data-testid="backtest-results">
      {/* Summary stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Annual Expected"
          value={formatMwh(summary.annual_expected_kwh)}
          icon={Zap}
        />
        <StatsCard
          title="Capacity Factor"
          value={`${(summary.annual_capacity_factor * 100).toFixed(1)}%`}
          icon={Gauge}
        />
        <StatsCard
          title="Monthly Avg Yield"
          value={formatMwh(summary.avg_monthly_yield_kwh)}
          icon={CalendarDays}
        />
        <StatsCard
          title="Verification"
          value={`${summary.months_verified}/${monthsTested} ✓`}
          description={
            summary.months_flagged > 0
              ? `${summary.months_flagged} flagged`
              : "All months verified"
          }
          icon={ShieldCheck}
        />
      </div>

      {/* Monthly production chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Production</CardTitle>
          <p className="text-sm text-muted-foreground">
            Expected vs. simulated inverter production, with ±15% tolerance band.
            Peak: {monthLabelLong(summary.peak_month)} · Low:{" "}
            {monthLabelLong(summary.low_month)} · Peak/trough ratio:{" "}
            {summary.peak_to_trough_ratio.toFixed(2)}×
          </p>
        </CardHeader>
        <CardContent>
          <ProductionChart months={months} />
        </CardContent>
      </Card>

      {/* Verification timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <VerificationTimeline months={months} />
        </CardContent>
      </Card>

      {/* Secondary charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cell Temperature</CardTitle>
            <p className="text-sm text-muted-foreground">
              Average cell temperature by month (estimated)
            </p>
          </CardHeader>
          <CardContent>
            <TemperatureChart months={months} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capacity Factor by Month</CardTitle>
            <p className="text-sm text-muted-foreground">Seasonal yield pattern</p>
          </CardHeader>
          <CardContent>
            <CapacityFactorChart months={months} />
          </CardContent>
        </Card>
      </div>

      {/* Revenue estimate (only when PPA rate provided) */}
      {summary.estimated_annual_revenue != null && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Revenue Estimate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-sm text-muted-foreground">Annual revenue</p>
                <p className="text-2xl font-bold" data-testid="text-annual-revenue">
                  {formatUsd(summary.estimated_annual_revenue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly avg</p>
                <p className="text-2xl font-bold">
                  {formatUsd(summary.estimated_monthly_yield_usd ?? 0)}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on a PPA rate of ${project.ppa_rate_per_kwh?.toFixed(3)}/kWh
              {project.ppa_escalator
                ? ` with ${project.ppa_escalator}% annual escalator`
                : ""}
              .
            </p>
          </CardContent>
        </Card>
      )}

      {/* System configuration (collapsed by default) */}
      <Card>
        <CardHeader>
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setShowConfig((v) => !v)}
            data-testid="button-toggle-config"
          >
            <CardTitle className="text-base">System Configuration</CardTitle>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showConfig ? "rotate-180" : ""}`}
            />
          </button>
        </CardHeader>
        {showConfig && (
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-3">
              <ConfigRow label="DC capacity" value={`${project.capacity_kw_dc} kW`} />
              <ConfigRow label="Tilt" value={`${project.tilt_deg}°`} />
              <ConfigRow label="Azimuth" value={`${project.azimuth_deg}°`} />
              <ConfigRow label="Module type" value={project.module_type} />
              <ConfigRow
                label="Module efficiency"
                value={`${(project.module_efficiency * 100).toFixed(0)}%`}
              />
              <ConfigRow label="Racking" value={project.racking_type} />
              <ConfigRow label="DC/AC ratio" value={`${project.dc_ac_ratio}`} />
              <ConfigRow
                label="System losses"
                value={`${((project.system_losses ?? 0.14) * 100).toFixed(0)}%`}
              />
              <ConfigRow
                label="Commissioned"
                value={project.commissioning_date}
              />
            </dl>
          </CardContent>
        )}
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <ReportDownloadButton result={result} />
        <Button variant="default" className="gap-2" data-testid="button-schedule-call">
          <CalendarClock className="h-4 w-4" />
          Schedule a Call with EcoXchange
        </Button>
      </div>

      <MethodologyNote engine={summary.expected_engine} />
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/50 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize">{value.replace(/_/g, " ")}</dd>
    </div>
  );
}
