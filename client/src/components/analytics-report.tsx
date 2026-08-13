import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Info, Printer } from "lucide-react";
import type {
  PlantAnalyticsProject,
  PlantAnalyticsRow,
} from "@shared/plant-analytics";

/**
 * Shared furniture for the three spec 22 reports.
 *
 * These are documents an owner hands to a warranty adjuster, a lender, or an
 * acquirer. Two consequences run through everything here.
 *
 * **They print.** A report that only exists inside a web app is not something
 * you attach to a claim.
 *
 * **They never show a number without what qualifies it.** A degradation rate
 * appears with its confidence interval or not at all; an estimated PPA rate says
 * so next to every dollar it produced; an availability figure built on derived
 * cumulative energy carries that fact. Stripping the qualifier makes a number
 * look *more* authoritative, not less, which is exactly backwards.
 */

export interface ProjectAnalytics extends PlantAnalyticsProject {
  generatedAt: string;
  engineVersion: string;
  rdtoolsVersion: string;
  asOfDate: string;
}

export function useProjectAnalytics(projectId: string | undefined) {
  return useQuery<ProjectAnalytics>({
    queryKey: ["/api/public/analytics/projects", projectId],
    enabled: Boolean(projectId),
    retry: false,
  });
}

/** Clear-sky is the default method and the one independent of site hardware. */
export function primaryRow(
  project: ProjectAnalytics | undefined,
): PlantAnalyticsRow | undefined {
  return project?.rows.find((r) => r.degradation_method === "clearsky") ??
    project?.rows[0];
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatKwh(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} GWh`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)} MWh`;
  return `${value.toFixed(0)} kWh`;
}

export function formatDate(value: string | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * A short, plain-language statement of what qualifies a figure.
 *
 * Rendered inline next to the number rather than as a footnote, because a
 * footnote is the part that does not survive being screenshotted into an email.
 */
export function Qualifier({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning";
  children: React.ReactNode;
}) {
  const warning = tone === "warning";
  const Icon = warning ? AlertTriangle : Info;
  // Light-first, with a dark: variant. The app's default palette is light
  // (`darkMode: ["class"]`, no class on <html>), and amber-200 on amber-500/10
  // renders as pale-on-pale there — which put the single most important
  // sentence on the certificate, the one saying the rate cannot be
  // distinguished from zero, at the lowest contrast on the page.
  return (
    <div
      className={`flex gap-2 rounded-md border p-3 text-sm ${
        warning
          ? "border-amber-500/60 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
          : "border-border/60 bg-muted/40 text-foreground/80"
      }`}
      data-testid={`qualifier-${tone}`}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function ReportShell({
  title,
  subtitle,
  project,
  isLoading,
  error,
  children,
}: {
  title: string;
  subtitle: string;
  project: ProjectAnalytics | undefined;
  isLoading: boolean;
  error: Error | null;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-4xl px-4 py-10 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-4xl px-4 py-10">
          <Card className="border-border/50" data-testid="card-analytics-unavailable">
            <CardHeader>
              <CardTitle>No analytics for this project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>{error?.message ?? "This project has not been analyzed."}</p>
              <Qualifier>
                This is not a statement that the plant is healthy. It means
                nobody has measured it yet. Analytics are produced by a scheduled
                job — <code>run_analytics.py</code> — that takes minutes per
                system and is never triggered by loading this page.
              </Qualifier>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
      <Header />
      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge
              variant="outline"
              className="mb-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              data-testid="badge-independent"
            >
              Independent third-party analysis
            </Badge>
            <h1
              className="text-3xl font-bold tracking-tight md:text-4xl"
              data-testid="text-report-title"
            >
              {title}
            </h1>
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.name} · PVDAQ system {project.systemId}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="print:hidden"
            onClick={() => window.print()}
            data-testid="button-print"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        {project.error ? (
          <Qualifier tone="warning">
            This project's analysis did not complete: {project.error}
          </Qualifier>
        ) : null}

        {children}

        <WindowAndProvenance project={project} />
      </div>
    </div>
  );
}

/**
 * Window, method, and versions — on every report, not just the certificate.
 *
 * A rate is only interpretable against the window it was measured over and the
 * assumptions it was normalized under. §5 requires those assumptions to be
 * frozen and versioned precisely so a number can be traced back to them later;
 * printing them here is what makes that traceability reach the reader.
 */
function WindowAndProvenance({ project }: { project: ProjectAnalytics }) {
  const row = primaryRow(project);
  const provenance: Partial<PlantAnalyticsRow["provenance"]> =
    row?.provenance ?? {};
  return (
    <Card className="border-border/50" data-testid="card-provenance">
      <CardHeader>
        <CardTitle className="text-base">Method and provenance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <Field label="Analysis window">
            {formatDate(project.window.start)} — {formatDate(project.window.end)}
          </Field>
          <Field label="Days analyzed">
            {row ? row.n_days_analyzed.toLocaleString() : "—"}
          </Field>
          <Field label="Normalization method">
            {row?.degradation_method === "clearsky"
              ? "Clear-sky (modeled irradiance)"
              : row?.degradation_method ?? "—"}
          </Field>
          <Field label="Confidence level">
            {provenance.confidence_level
              ? `${provenance.confidence_level}%`
              : "—"}
          </Field>
          <Field label="RdTools version">{project.rdtoolsVersion}</Field>
          <Field label="Engine version">{project.engineVersion}</Field>
          <Field label="Computed">{formatDate(project.asOfDate)}</Field>
          <Field label="Temperature coefficient">
            {provenance.gamma_pdc !== undefined ? `${provenance.gamma_pdc} /°C` : "—"}
          </Field>
        </dl>

        <div>
          <p className="font-medium text-foreground">Why this window</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            {project.window.rationale}
          </p>
        </div>

        {project.caveats.length > 0 ? (
          <div className="space-y-2">
            <p className="font-medium text-foreground">
              What a reader should know about this site
            </p>
            {project.caveats.map((caveat, i) => (
              <Qualifier key={i} tone="warning">
                {caveat}
              </Qualifier>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** Notes matching a prefix, rendered as qualifiers. */
export function NotesPanel({
  notes,
  match,
  title,
}: {
  notes: string[];
  match: (note: string) => boolean;
  title: string;
}) {
  const relevant = notes.filter(match);
  if (relevant.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {relevant.map((note, i) => (
        <Qualifier
          key={i}
          tone={
            note.startsWith("DISAGREEMENT:") || note.includes("CAUTION")
              ? "warning"
              : "info"
          }
        >
          {note}
        </Qualifier>
      ))}
    </div>
  );
}
