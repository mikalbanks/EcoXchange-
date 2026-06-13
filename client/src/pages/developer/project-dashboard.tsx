import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Zap, Gauge, Users, CalendarClock, Radio } from "lucide-react";
import { ProductionChart } from "@/components/shared/production-chart";
import { monthLabelLong, formatMwh } from "@/lib/backtest-format";
import type { BacktestCompletePayload } from "@shared/developer-backtest";

export default function ProjectDashboard() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<BacktestCompletePayload>({
    queryKey: ["/api/developer/backtest", id],
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Project Dashboard" description="Loading…">
        <Skeleton className="mb-4 h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Project Dashboard" description="Not found">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Project not found.{" "}
            <Button variant="link" onClick={() => setLocation("/developer")}>
              Back to projects
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const { project, summary, monthly_results: months } = data;

  return (
    <DashboardLayout
      title={project.name}
      description={`${project.latitude.toFixed(2)}°, ${project.longitude.toFixed(2)}° · ${project.capacity_kw_dc} kW DC`}
      breadcrumbs={[{ label: "Developer", href: "/developer" }, { label: project.name }]}
      actions={
        <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600">
          <Radio className="h-3 w-3" />
          Onboarding
        </Badge>
      }
    >
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-3 p-4">
          <Radio className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Live inverter data — Coming Soon.</span>{" "}
            This dashboard currently shows your production backtest. Once your
            inverter API is connected post-LOI, real production will replace the
            simulated figures here — the layout stays identical.
          </p>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Annual Production"
          value={formatMwh(summary.annual_expected_kwh)}
          description="Backtested expectation"
          icon={Zap}
        />
        <StatsCard
          title="Capacity Factor"
          value={`${(summary.annual_capacity_factor * 100).toFixed(1)}%`}
          icon={Gauge}
        />
        <StatsCard title="Current Investors" value="—" description="Pre-offering" icon={Users} />
        <StatsCard
          title="Next Distribution"
          value="—"
          description="After go-live"
          icon={CalendarClock}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Production & Verification</CardTitle>
          <p className="text-sm text-muted-foreground">
            Expected vs. simulated inverter (real meter data coming soon)
          </p>
        </CardHeader>
        <CardContent>
          <ProductionChart months={months} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Inverter (sim.)</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Deviation</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((m) => (
                <TableRow key={m.month} data-testid={`verification-row-${m.month}`}>
                  <TableCell>{monthLabelLong(m.month)}</TableCell>
                  <TableCell className="text-right">{formatMwh(m.simulated_inverter_kwh)}</TableCell>
                  <TableCell className="text-right">{formatMwh(m.expected_kwh)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.deviation_pct > 0 ? "+" : ""}
                    {m.deviation_pct}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={
                        m.status === "verified"
                          ? "border-emerald-500/40 text-emerald-600"
                          : "border-amber-500/40 text-amber-600"
                      }
                    >
                      {m.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
