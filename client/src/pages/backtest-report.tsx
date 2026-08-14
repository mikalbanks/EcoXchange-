import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  Shield, AlertTriangle, TrendingUp, Zap, Clock, BarChart3,
  Printer, FileText, MapPin, Sun, Activity, Download, Loader2, Database,
} from "lucide-react";
import { describeBacktestEvidence } from "@shared/evidence-disclosure";
import { EvidenceDisclosureText } from "@/components/evidence/evidence-disclosure-text";
import {
  describeMeterPresentation,
  describeSatelliteSource,
  type SatelliteSource,
} from "@/components/evidence/backtest-presentation";

interface BacktestSite {
  siteId: string;
  siteName: string;
  latitude: number;
  longitude: number;
  capacityKw: number;
  arrayType: string;
  startDate: string;
  endDate: string;
}

interface BacktestStatistics {
  mae: number;
  rmse: number;
  passRate2Pct: number;
  passRate5Pct: number;
  confidenceScore: number;
  peakProductionHour: number;
  totalEnergyMwh: number;
  totalIntervals: number;
  daylightIntervals: number;
  nightIntervals: number;
  errorBuckets: {
    within1Pct: number;
    within2Pct: number;
    within5Pct: number;
    above5Pct: number;
  };
}

interface BacktestInterval {
  timestamp: string;
  hour: number;
  satelliteKw: number;
  meterKw: number;
  deltaKw: number;
  deltaPct: number;
  handshakeCleared2Pct: boolean;
  handshakeCleared5Pct: boolean;
}

type MeterDataSourceType = "synthetic" | "stored";

interface BacktestReportData {
  site: BacktestSite;
  statistics: BacktestStatistics;
  intervals: BacktestInterval[];
  satelliteSource: SatelliteSource;
  meterDataSource?: MeterDataSourceType;
  generatedAt: string;
  engineVersion: string;
}

interface SourceDoc {
  label: string;
  details: string;
}

function ConfidenceGauge({ score }: { score: number }) {
  const radius = 80;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = "#3B82F6";

  return (
    <div className="flex flex-col items-center" data-testid="gauge-confidence">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-muted/20"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          className="transition-all duration-1000"
        />
        <text x="100" y="85" textAnchor="middle" className="fill-foreground" fontSize="36" fontWeight="bold">
          {score.toFixed(1)}%
        </text>
        <text x="100" y="108" textAnchor="middle" className="fill-muted-foreground" fontSize="12">
          ALIGNMENT SCORE
        </text>
      </svg>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, color }: {
  icon: LucideIcon; label: string; value: string; sublabel?: string; color?: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-1" style={color ? { color } : undefined} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

async function exportToPdf(element: HTMLElement, filename: string) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const printHeader = element.querySelector("[data-pdf-header]") as HTMLElement | null;
  const actionBar = element.querySelector("[data-pdf-action-bar]") as HTMLElement | null;
  const appHeader = element.querySelector("[data-pdf-app-header]") as HTMLElement | null;

  if (printHeader) printHeader.style.display = "block";
  if (actionBar) actionBar.style.display = "none";
  if (appHeader) appHeader.style.display = "none";
  element.classList.add("pdf-capture-mode");

  try {
    await new Promise(r => setTimeout(r, 300));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 1100,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const contentWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    let yOffset = 0;
    let pageNum = 0;
    const availableHeight = pageHeight - margin * 2;

    while (yOffset < imgHeight) {
      if (pageNum > 0) pdf.addPage();

      const sourceY = (yOffset / imgHeight) * canvas.height;
      const sourceHeight = Math.min(
        (availableHeight / imgHeight) * canvas.height,
        canvas.height - sourceY
      );
      const sliceHeight = (sourceHeight / canvas.height) * imgHeight;

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sourceHeight;
      const ctx = sliceCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, sliceCanvas.width, sourceHeight
        );
      }

      const sliceData = sliceCanvas.toDataURL("image/png");
      pdf.addImage(sliceData, "PNG", margin, margin, contentWidth, sliceHeight);

      yOffset += availableHeight;
      pageNum++;
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    pdf.save(safeFilename);
  } finally {
    element.classList.remove("pdf-capture-mode");
    if (printHeader) printHeader.style.display = "";
    if (actionBar) actionBar.style.display = "";
    if (appHeader) appHeader.style.display = "";
  }
}

export default function BacktestReportPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [pdfExporting, setPdfExporting] = useState(false);
  const { toast } = useToast();

  const { data: report, isLoading, error } = useQuery<BacktestReportData>({
    queryKey: ["/api/public/backtest/report"],
    queryFn: async () => {
      const res = await fetch("/api/public/backtest/report");
      if (!res.ok) throw new Error("Failed to fetch backtest report");
      return res.json();
    },
  });

  const handleDownloadPdf = useCallback(async () => {
    if (!reportRef.current || !report) return;
    setPdfExporting(true);
    try {
      const dateStr = new Date(report.generatedAt).toISOString().slice(0, 10);
      const filename = `SGT-Backtest-${report.site.siteId}-${dateStr}.pdf`;
      await exportToPdf(reportRef.current, filename);
      toast({ title: "PDF downloaded", description: filename });
    } catch (err) {
      console.error("PDF export failed:", err);
      toast({ title: "PDF export failed", description: "Please try again or use Print Report instead.", variant: "destructive" });
    } finally {
      setPdfExporting(false);
    }
  }, [report, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark">
        <Header />
        <div className="container mx-auto px-4 py-16 space-y-6">
          <Skeleton className="h-12 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-dark">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Report Unavailable</h1>
          <p className="text-muted-foreground mt-2">Unable to generate backtest report. Please try again later.</p>
        </div>
      </div>
    );
  }

  const { site, statistics, intervals } = report;
  const evidence = describeBacktestEvidence(report.meterDataSource, report.satelliteSource);
  const satellitePresentation = describeSatelliteSource(report.satelliteSource);
  const meterPresentation = describeMeterPresentation(report);
  const satelliteLabel = satellitePresentation.displayLabel;

  const chartData = intervals
    .filter(i => i.meterKw > 0 || i.satelliteKw > 0)
    .map(i => ({
      time: new Date(i.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
            new Date(i.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      satellite: Number(i.satelliteKw.toFixed(0)),
      meter: Number(i.meterKw.toFixed(0)),
      delta: Number(i.deltaPct.toFixed(2)),
    }));

  const dailyData: Record<string, { satellite: number; meter: number; count: number }> = {};
  for (const i of intervals) {
    const day = new Date(i.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!dailyData[day]) dailyData[day] = { satellite: 0, meter: 0, count: 0 };
    dailyData[day].satellite += i.satelliteKw * 0.25;
    dailyData[day].meter += i.meterKw * 0.25;
    dailyData[day].count++;
  }
  const dailyChartData = Object.entries(dailyData).map(([day, d]) => ({
    day,
    satellite: Number((d.satellite / 1000).toFixed(1)),
    meter: Number((d.meter / 1000).toFixed(1)),
    delta: Number(Math.abs((d.satellite - d.meter) / d.meter * 100).toFixed(2)),
  }));

  const bucketData = [
    { name: "≤1%", value: statistics.errorBuckets.within1Pct, fill: "#A3E635" },
    { name: "1-2%", value: statistics.errorBuckets.within2Pct, fill: "#90C11B" },
    { name: "2-5%", value: statistics.errorBuckets.within5Pct, fill: "#EAB308" },
    { name: ">5%", value: statistics.errorBuckets.above5Pct, fill: "#EF4444" },
  ];

  const pieData = [
    { name: "Within ±2%", value: statistics.passRate2Pct, fill: "#3B82F6" },
    { name: "Within ±5% only", value: statistics.passRate5Pct - statistics.passRate2Pct, fill: "#64748B" },
    { name: "Outside ±5%", value: Math.max(0, 100 - statistics.passRate5Pct), fill: "#EF4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-gradient-dark print:bg-white print:text-black" ref={reportRef}>
      <style>{`
        .pdf-capture-mode {
          background: white !important;
          color: black !important;
        }
        .pdf-capture-mode * {
          color: black !important;
          border-color: #d1d5db !important;
        }
        .pdf-capture-mode .bg-card\\/80,
        .pdf-capture-mode .bg-card\\/50,
        .pdf-capture-mode [class*="bg-card"] {
          background-color: white !important;
        }
        .pdf-capture-mode .bg-gradient-dark {
          background: white !important;
        }
        .pdf-capture-mode [class*="text-muted"] {
          color: #4b5563 !important;
        }
        .pdf-capture-mode [class*="text-primary"] {
          color: #A3E635 !important;
        }
        .pdf-capture-mode [class*="bg-primary\\/5"],
        .pdf-capture-mode [class*="bg-primary\\/20"] {
          background-color: #f0fdf4 !important;
        }
        .pdf-capture-mode [data-testid="stat-mae"] { color: #A3E635 !important; }
      `}</style>
      <div className="print:hidden" data-pdf-app-header>
        <Header />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8 print:space-y-6 print:py-4">
        <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-start sm:justify-between" data-pdf-action-bar>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm mb-2">
              <FileText className="h-4 w-4" />
              <span>SGT Evidence Replay</span>
              <Badge variant="outline" className="text-xs">{report.engineVersion}</Badge>
              {report.meterDataSource === "stored" && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs gap-1" data-testid="badge-stored-data">
                  <Database className="h-3 w-3" /> Stored Production Records
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight" data-testid="text-report-title">
              SGT Backtest Evidence Report
            </h1>
            <p className="text-muted-foreground mt-1">
              Generated {new Date(report.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={pdfExporting}
              data-testid="button-download-pdf"
            >
              {pdfExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {pdfExporting ? "Generating..." : "Download PDF"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        <Card className="print:hidden border-border/50" data-testid="card-backtest-read-only">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm font-semibold">Read-only evidence snapshot</p>
            <p className="mt-1 text-base leading-relaxed text-muted-foreground">
              Public replay controls are disabled. This page displays the server-provided report and does not let visitors change project data or replace the report for other visitors.
            </p>
          </CardContent>
        </Card>

        <Card className={evidence.level === "partial" ? "border-blue-500/30 bg-blue-500/5" : "border-amber-500/30 bg-amber-500/5"} data-testid="backtest-evidence-disclosure">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className={evidence.level === "partial" ? "mt-0.5 h-5 w-5 shrink-0 text-blue-400" : "mt-0.5 h-5 w-5 shrink-0 text-amber-400"} />
              <EvidenceDisclosureText evidence={evidence} descriptionTestId="text-evidence-description" />
            </div>
          </CardContent>
        </Card>

        <div className="hidden print:block border-b-2 border-black pb-4 mb-6" data-pdf-header>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">EcoXchange — SGT Backtest Evidence Report</h1>
              <p className="text-sm text-gray-600 mt-1">
                Generated {new Date(report.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} | Engine {report.engineVersion}
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>DEMONSTRATION EVIDENCE</p>
              <p>Method and model review</p>
            </div>
          </div>
        </div>

        <Card className="border-border/60 bg-card/80 print:border-gray-300 print:bg-white">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-1 flex justify-center">
                <ConfidenceGauge score={statistics.confidenceScore} />
              </div>
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2" data-testid="text-validation-summary">
                    <Shield className="h-5 w-5 text-blue-400" />
                    Evidence Replay Summary
                  </h2>
                  <p className="text-muted-foreground mt-2 print:text-gray-600 leading-relaxed" data-testid="text-validation-statement">
                    This replay compares {report.meterDataSource === "stored" ? "stored production records whose origin is not encoded" : "a synthesized meter baseline"} with {satelliteLabel} for site label {site.siteId}.
                    It produced {statistics.mae.toFixed(2)}% mean absolute error, with {statistics.passRate5Pct.toFixed(1)}% of intervals inside the configured 5% band,
                    and a {statistics.confidenceScore.toFixed(1)}% alignment score across {statistics.daylightIntervals.toLocaleString()} daylight intervals. {evidence.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={evidence.level === "partial"
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}
                    data-testid="badge-satellite-source"
                  >
                    {satellitePresentation.badgeLabel}
                  </Badge>
                  <Badge variant="outline" data-testid="badge-mae-band">
                    MAE {statistics.mae.toFixed(2)}% {statistics.mae < 5 ? "within 5% band" : "outside 5% band"}
                  </Badge>
                  <Badge variant="outline" data-testid="badge-band-rate">
                    {statistics.passRate5Pct.toFixed(1)}% within ±5% band
                  </Badge>
                  <Badge variant="outline" data-testid="badge-intervals">
                    {statistics.totalIntervals.toLocaleString()} intervals analyzed
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print:border-gray-300 print:bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Site Under Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Site ID</p>
                <p className="font-medium" data-testid="text-site-id">{meterPresentation.siteIdentifier}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{site.latitude}°N, {Math.abs(site.longitude)}°W</p>
              </div>
              <div>
                <p className="text-muted-foreground">Capacity</p>
                <p className="font-medium">{(site.capacityKw / 1000).toFixed(1)} MW ({site.capacityKw.toLocaleString()} kW)</p>
              </div>
              <div>
                <p className="text-muted-foreground">Array Type</p>
                <p className="font-medium capitalize">{site.arrayType.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Replay Period</p>
                <p className="font-medium">{site.startDate} — {site.endDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Energy</p>
                <p className="font-medium">{statistics.totalEnergyMwh.toLocaleString()} MWh</p>
              </div>
              <div>
                <p className="text-muted-foreground">Peak Hour (UTC)</p>
                <p className="font-medium">{statistics.peakProductionHour}:00</p>
              </div>
              <div>
                <p className="text-muted-foreground">Satellite Source</p>
                <p className="font-medium">{satelliteLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Activity} label="MAE" value={`${statistics.mae.toFixed(2)}%`} sublabel="Mean Absolute Error" />
          <StatCard icon={BarChart3} label="RMSE" value={`${statistics.rmse.toFixed(2)}%`} sublabel="Root Mean Square Error" />
          <StatCard icon={Activity} label="Within ±2%" value={`${statistics.passRate2Pct.toFixed(1)}%`} sublabel="Configured alignment band" />
          <StatCard icon={Shield} label="Within ±5%" value={`${statistics.passRate5Pct.toFixed(1)}%`} sublabel="Configured alignment band" />
        </div>

        <Card className="print:break-before-page print:border-gray-300 print:bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="text-chart-title">
              <Sun className="h-5 w-5 text-primary" />
              Daily Production Comparison
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Satellite Power ({satelliteLabel}) vs. Meter Power (site label {site.siteId}) — daily energy in MWh
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]" data-testid="chart-daily-comparison">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: "MWh", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => [`${value} MWh`, name === "satellite" ? "Satellite" : "Meter"]}
                  />
                  <Legend />
                  <Bar dataKey="satellite" name={satellitePresentation.seriesLabel} fill="#A3E635" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="meter" name={meterPresentation.seriesLabel} fill="#3B82F6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="print:border-gray-300 print:bg-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Error Distribution (Daylight Intervals)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]" data-testid="chart-error-distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bucketData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: "Intervals", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value: number) => [`${value} intervals`]}
                    />
                    <Bar dataKey="value" name="Intervals" radius={[4, 4, 0, 0]}>
                      {bucketData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="print:border-gray-300 print:bg-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Configured Band Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center justify-center" data-testid="chart-clearance-rate">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="print:break-before-page print:border-gray-300 print:bg-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Interval Detail (Every 4th Point Rendered)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {statistics.totalIntervals.toLocaleString()} total intervals, chart renders every 4th for readability
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]" data-testid="chart-interval-detail">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.filter((_, i) => i % 4 === 0)}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval={Math.floor(chartData.length / 30)} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: "kW", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value: number, name: string) => [`${value} kW`, name === "satellite" ? "Satellite" : "Meter"]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="satellite" name={satellitePresentation.seriesLabel} stroke="#A3E635" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="meter" name={meterPresentation.seriesLabel} stroke="#3B82F6" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="print:border-gray-300 print:bg-white">
          <CardHeader>
            <CardTitle className="text-base">Technical Summary</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none print:text-black">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground print:text-black">Methodology</h4>
                <ul className="space-y-1 text-muted-foreground print:text-gray-700">
                  <li>{satellitePresentation.methodology}</li>
                  <li>{meterPresentation.methodology}</li>
                  <li>15-minute interval granularity across {statistics.totalIntervals.toLocaleString()} data points</li>
                  <li>Daylight-only statistical analysis ({statistics.daylightIntervals.toLocaleString()} intervals)</li>
                  <li>Handshake tolerance tested at 2% and 5% thresholds</li>
                  <li>Data source: <strong>{satellitePresentation.displayLabel}</strong></li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground print:text-black">Findings</h4>
                <ul className="space-y-1 text-muted-foreground print:text-gray-700">
                  <li>MAE of {statistics.mae.toFixed(2)}% is {statistics.mae < 5 ? "within" : "outside"} the configured 5% alignment band</li>
                  <li>RMSE of {statistics.rmse.toFixed(2)}% indicates {statistics.rmse < 3 ? "minimal" : statistics.rmse < 6 ? "moderate" : "significant"} outlier impact</li>
                  <li>{statistics.passRate5Pct.toFixed(1)}% of daylight intervals fall within the configured ±5% band</li>
                  <li>{statistics.errorBuckets.within1Pct} intervals ({((statistics.errorBuckets.within1Pct / statistics.daylightIntervals) * 100).toFixed(1)}%) within ±1% — near-exact match</li>
                  <li>Peak production observed at {statistics.peakProductionHour}:00 UTC ({statistics.totalEnergyMwh.toLocaleString()} MWh total)</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg print:bg-gray-50 print:border-gray-300">
              <p className="text-sm font-medium text-foreground print:text-black" data-testid="text-conclusion">
                {report.meterDataSource === "stored" ? (
                  <>
                    Conclusion: This replay shows {statistics.mae.toFixed(2)}% mean absolute error and a {statistics.confidenceScore.toFixed(1)}% alignment score
                    between stored production records of unstated origin and the configured {satellitePresentation.displayLabel.toLowerCase()}.
                    It does not establish utility-meter provenance, full three-source independence, or suitability for investor reporting.
                  </>
                ) : (
                  <>
                    Conclusion: This model replay demonstrates pipeline behavior using a synthesized meter baseline for site {site.siteId}.
                    The {statistics.confidenceScore.toFixed(1)}% alignment score and {statistics.mae.toFixed(2)}% mean absolute error describe agreement between modeled series.
                    They do not validate operating production or independent meter-to-satellite verification.
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="print:break-before-page print:border-gray-300 print:bg-white">
          <CardHeader>
            <CardTitle className="text-base">Data Sources & Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const sources: SourceDoc[] = [
                {
                  label: "Project Metadata",
                  details: `EcoXchange internal project registry (${site.siteId}), coordinates ${site.latitude} / ${site.longitude}, capacity ${site.capacityKw.toLocaleString()} kW.`,
                },
                {
                  label: "Satellite Estimate",
                  details:
                    satellitePresentation.documentation,
                },
                {
                  label: "Meter Baseline",
                  details:
                    report.meterDataSource === "stored"
                      ? "EcoXchange stored production records. Their ingestion origin is not encoded, and this report does not attest utility-meter provenance."
                      : "Synthetic meter baseline modeled from site geometry, capacity, and production profile assumptions.",
                },
                {
                  label: "Comparison Method",
                  details:
                    "15-minute interval SGT handshake comparison; pass/fail at ±2% and ±5% tolerance bands; MAE and RMSE computed over daylight intervals.",
                },
              ];

              return (
                <div className="space-y-3">
                  {sources.map((source) => (
                    <div key={source.label} className="rounded-lg border border-border/60 p-3">
                      <p className="text-sm font-semibold">{source.label}</p>
                      <p className="text-sm text-muted-foreground mt-1">{source.details}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground py-4 print:text-gray-500 print:border-t print:border-gray-300 print:mt-8">
          <p>EcoXchange SGT Backtest Evidence Report — {report.engineVersion} — Generated {new Date(report.generatedAt).toISOString()}</p>
          <p className="mt-1">Method demonstration only. This report does not establish independent production verification or investment suitability.</p>
        </div>
      </div>
    </div>
  );
}
