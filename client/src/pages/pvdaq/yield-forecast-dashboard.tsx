import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, DollarSign, BarChart3, Sun, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Header } from "@/components/header";

type KpiData = {
  system_id: number;
  public_name: string;
  capacity_kw: number;
  technology: string;
  tracking_type: string;
  location_state: string;
  total_mwh: number;
  avg_daily_mwh: number;
  total_revenue_usd: number;
  trailing_12mo_revenue: number;
  start_month: string;
  end_month: string;
  total_months: number;
};

type MonthlyRow = {
  month: string;
  monthly_energy_kwh: number;
  avg_power_kw: number;
  peak_power_kw: number;
  capacity_factor: number;
  estimated_revenue_usd: number;
};

type ForecastRow = {
  forecast_month: string;
  forecast_energy_kwh: number;
  forecast_revenue_usd: number;
};

const SYSTEM_ID = 9068;

function formatUsd(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function formatMwh(val: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(val);
}

export default function YieldForecastDashboard() {
  const [ppa, setPpa] = useState(0.085);
  const [degradation, setDegradation] = useState(0.5);

  const kpisQuery = useQuery<KpiData>({
    queryKey: ["/api/pvdaq/systems", SYSTEM_ID, "kpis"],
    queryFn: () => fetch(`/api/pvdaq/systems/${SYSTEM_ID}/kpis`).then((r) => r.json()),
  });

  const monthlyQuery = useQuery<MonthlyRow[]>({
    queryKey: ["/api/pvdaq/systems", SYSTEM_ID, "monthly"],
    queryFn: () => fetch(`/api/pvdaq/systems/${SYSTEM_ID}/monthly`).then((r) => r.json()),
  });

  const validPpa = ppa > 0 && ppa <= 1;
  const validDegradation = degradation >= 0 && degradation <= 10;

  const forecastQuery = useQuery<ForecastRow[]>({
    queryKey: ["/api/pvdaq/systems", SYSTEM_ID, "forecast", ppa, degradation],
    queryFn: () =>
      fetch(`/api/pvdaq/systems/${SYSTEM_ID}/forecast?ppa=${ppa}&degradation=${degradation / 100}`).then((r) => {
        if (!r.ok) throw new Error("Forecast request failed");
        return r.json();
      }),
    enabled: validPpa && validDegradation,
  });

  const kpis = kpisQuery.data;
  const monthly = monthlyQuery.data ?? [];
  const forecast = Array.isArray(forecastQuery.data) ? forecastQuery.data : [];

  const forecastTotalRevenue = forecast.reduce((sum, r) => sum + r.forecast_revenue_usd, 0);

  const chartMonthly = monthly.map((r) => ({
    month: r.month,
    energy_mwh: Number((r.monthly_energy_kwh / 1000).toFixed(1)),
    revenue: Number(r.estimated_revenue_usd.toFixed(0)),
  }));

  const chartForecast = forecast.map((r) => ({
    month: r.forecast_month,
    forecast_mwh: Number((r.forecast_energy_kwh / 1000).toFixed(1)),
    forecast_revenue: Number(r.forecast_revenue_usd.toFixed(0)),
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sun className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
              Yield Forecast Dashboard
            </h1>
          </div>
          {kpis && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-primary border-primary" data-testid="badge-system-name">
                {kpis.public_name}
              </Badge>
              <Badge variant="secondary" data-testid="badge-capacity">
                {(kpis.capacity_kw / 1000).toFixed(1)} MW
              </Badge>
              <Badge variant="secondary" data-testid="badge-technology">
                {kpis.technology} · {kpis.tracking_type}
              </Badge>
              <Badge variant="secondary" data-testid="badge-location">
                {kpis.location_state}
              </Badge>
            </div>
          )}
          <p className="text-muted-foreground mt-2 text-sm">
            Real NREL PVDAQ telemetry data — proving the energy-to-yield intelligence pipeline.
          </p>
        </div>

        {kpisQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6 h-24" />
              </Card>
            ))}
          </div>
        ) : kpis ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card data-testid="card-kpi-total-mwh">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Zap className="h-4 w-4" />
                  Total Historical Production
                </div>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-mwh">
                  {formatMwh(kpis.total_mwh)} MWh
                </p>
                <p className="text-xs text-muted-foreground mt-1">{kpis.total_months} months of data</p>
              </CardContent>
            </Card>
            <Card data-testid="card-kpi-avg-daily">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <BarChart3 className="h-4 w-4" />
                  Avg Daily Production
                </div>
                <p className="text-2xl font-bold text-foreground" data-testid="text-avg-daily-mwh">
                  {formatMwh(kpis.avg_daily_mwh)} MWh
                </p>
                <p className="text-xs text-muted-foreground mt-1">Averaged across all months</p>
              </CardContent>
            </Card>
            <Card data-testid="card-kpi-trailing-revenue">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" />
                  Trailing 12-Month Revenue
                </div>
                <p className="text-2xl font-bold text-primary" data-testid="text-trailing-revenue">
                  {formatUsd(kpis.trailing_12mo_revenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">At assumed PPA rate</p>
              </CardContent>
            </Card>
            <Card data-testid="card-kpi-forecast-revenue">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Next 12-Month Forecast
                </div>
                <p className="text-2xl font-bold text-primary" data-testid="text-forecast-revenue">
                  {formatUsd(forecastTotalRevenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PPA: ${ppa}/kWh · Deg: {degradation}%/yr
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <Card className="lg:col-span-2" data-testid="card-assumptions">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Financial Assumptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ppa-input" className="text-sm text-muted-foreground">
                    PPA Rate ($/kWh)
                  </Label>
                  <Input
                    id="ppa-input"
                    data-testid="input-ppa"
                    type="number"
                    step="0.005"
                    min="0.01"
                    max="1"
                    value={ppa}
                    onChange={(e) => setPpa(Number(e.target.value))}
                    className="w-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="degradation-input" className="text-sm text-muted-foreground">
                    Annual Degradation (%)
                  </Label>
                  <Input
                    id="degradation-input"
                    data-testid="input-degradation"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={degradation}
                    onChange={(e) => setDegradation(Number(e.target.value))}
                    className="w-32"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Adjust assumptions to see how they affect the 12-month forward forecast. Changes update in real time.
              </p>
            </CardContent>
          </Card>
          <Card data-testid="card-data-source">
            <CardHeader>
              <CardTitle className="text-base">Data Source</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>NREL PVDAQ — System 9068</p>
              <p>4.7 MW CdTe single-axis tracking</p>
              <p>Location: Colorado, USA</p>
              <p>Model: Seasonal historical average (v1)</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card data-testid="card-chart-generation">
            <CardHeader>
              <CardTitle className="text-base">Monthly Energy Generation (MWh)</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyQuery.isLoading ? (
                <div className="h-72 animate-pulse bg-muted rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      interval={5}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number) => [`${formatMwh(value)} MWh`, "Generation"]}
                    />
                    <Bar dataKey="energy_mwh" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-chart-revenue">
            <CardHeader>
              <CardTitle className="text-base">Monthly Estimated Revenue (USD)</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyQuery.isLoading ? (
                <div className="h-72 animate-pulse bg-muted rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      interval={5}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number) => [formatUsd(value), "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="#90C11B" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8" data-testid="card-chart-forecast">
          <CardHeader>
            <CardTitle className="text-base">12-Month Forward Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            {forecastQuery.isLoading ? (
              <div className="h-72 animate-pulse bg-muted rounded" />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="forecast_mwh"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Forecast MWh"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast_revenue"
                      stroke="#90C11B"
                      strokeWidth={2}
                      name="Forecast Revenue ($)"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                <div className="overflow-auto max-h-[300px]">
                  <table className="w-full text-sm" data-testid="table-forecast">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 px-2">Month</th>
                        <th className="text-right py-2 px-2">Energy (MWh)</th>
                        <th className="text-right py-2 px-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.map((row) => (
                        <tr key={row.forecast_month} className="border-b border-border/50" data-testid={`row-forecast-${row.forecast_month}`}>
                          <td className="py-2 px-2 text-foreground">{row.forecast_month}</td>
                          <td className="py-2 px-2 text-right text-foreground">
                            {formatMwh(row.forecast_energy_kwh / 1000)}
                          </td>
                          <td className="py-2 px-2 text-right text-primary font-medium">
                            {formatUsd(row.forecast_revenue_usd)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t-2 border-primary/30">
                        <td className="py-2 px-2 text-foreground">Total</td>
                        <td className="py-2 px-2 text-right text-foreground">
                          {formatMwh(forecast.reduce((s, r) => s + r.forecast_energy_kwh, 0) / 1000)}
                        </td>
                        <td className="py-2 px-2 text-right text-primary">
                          {formatUsd(forecastTotalRevenue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
