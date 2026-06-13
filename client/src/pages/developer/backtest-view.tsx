import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { BacktestProgress } from "@/components/developer/backtest-progress";
import { BacktestResults } from "@/components/developer/backtest-results";
import { useBacktestStream } from "@/hooks/use-backtest-stream";
import { takePendingBacktest } from "@/lib/pending-backtest";
import type {
  BacktestCompletePayload,
  BacktestRequest,
} from "@shared/developer-backtest";

export default function BacktestView() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const stream = useBacktestStream();
  const startedRef = useRef(false);
  const [meta, setMeta] = useState<{ name: string; location: string } | null>(null);

  const isNew = id === "new";

  // Kick off the stream from the pending intake request (once).
  useEffect(() => {
    if (!isNew || startedRef.current) return;
    startedRef.current = true;
    const pending = takePendingBacktest();
    if (!pending) {
      setLocation("/developer/onboard", { replace: true });
      return;
    }
    setMeta({
      name: pending.project.name,
      location: `${pending.project.latitude.toFixed(2)}°, ${pending.project.longitude.toFixed(2)}°`,
    });
    void stream.start(pending as BacktestRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  // Once complete, swap the URL to the real id (state persists across replace).
  useEffect(() => {
    if (stream.status === "complete" && stream.result && isNew) {
      setLocation(`/developer/backtest/${stream.result.backtest_id}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.status, stream.result]);

  // Existing result (reload / shared link).
  const { data: fetched, isLoading } = useQuery<BacktestCompletePayload>({
    queryKey: ["/api/developer/backtest", id],
    enabled: !isNew && !stream.result,
  });

  const result = stream.result ?? fetched ?? null;

  return (
    <DashboardLayout
      title="Production Backtest"
      description={result ? `${result.project.name}` : "Live backtest results"}
      breadcrumbs={[{ label: "Developer", href: "/developer" }, { label: "Backtest" }]}
      actions={
        <Button variant="outline" className="gap-2" onClick={() => setLocation("/developer")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
      }
    >
      {stream.status === "error" ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Backtest failed</p>
              <p className="text-sm text-muted-foreground">{stream.error}</p>
            </div>
            <Button className="ml-auto" onClick={() => setLocation("/developer/onboard")}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : result ? (
        <BacktestResults result={result} />
      ) : stream.status === "streaming" || isNew ? (
        <BacktestProgress
          projectName={meta?.name ?? "Your project"}
          location={meta?.location ?? ""}
          progressPct={stream.progressPct}
          message={stream.message}
          months={stream.months}
        />
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Backtest not found.{" "}
            <Button variant="link" onClick={() => setLocation("/developer/onboard")}>
              Run a new backtest
            </Button>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
