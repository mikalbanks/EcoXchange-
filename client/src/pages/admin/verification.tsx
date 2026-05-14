import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface VerificationRun {
  id: string;
  projectId: string;
  intervalId: number | null;
  granularity: string;
  periodStart: string;
  periodEnd: string;
  expectedKwh: string;
  actualKwh: string;
  variancePct: string;
  tolerancePct: string;
  ppaRateUsdPerKwh: string;
  ppaSource: string;
  offtakerClass: string;
  plantUse: string;
  grossRevenueUsd: string;
  status: string;
  evidenceHash: string;
  settledTransactionId: string | null;
  runAt: string;
  settledAt: string | null;
}

interface AnomalyFlag {
  id: number;
  ruleCode: string;
  severity: string;
  detail: Record<string, unknown>;
  raisedAt: string;
  clearedAt: string | null;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "VERIFIED" || status === "SETTLED") return "default";
  if (status === "FLAGGED") return "secondary";
  if (status === "REJECTED") return "destructive";
  return "outline";
}

function VerificationStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={statusVariant(status)} data-testid={`status-${status}`}>
      {status}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const variant: "default" | "secondary" | "destructive" =
    severity === "BLOCK" ? "destructive" : severity === "WARN" ? "secondary" : "default";
  return <Badge variant={variant}>{severity}</Badge>;
}

function EvidenceChainViewer({ runId, projectId }: { runId: string; projectId: string }) {
  const { data, isLoading } = useQuery<{
    run: VerificationRun;
    anomalies: AnomalyFlag[];
    snapshot: any;
    transaction: any;
    postings: any[];
  }>({
    queryKey: [`/api/projects/${projectId}/verification/runs/${runId}`],
  });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading evidence…</div>;
  const { run, anomalies, snapshot, transaction, postings } = data;

  return (
    <div className="space-y-4 text-sm">
      <section>
        <div className="font-semibold mb-1">1. Irradiance snapshot</div>
        {snapshot ? (
          <div className="rounded border p-3 grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Source:</span> {snapshot.satelliteSource}</div>
            <div><span className="text-muted-foreground">PV est:</span> {Number(snapshot.pvEstimateKw).toFixed(2)} kW</div>
            <div><span className="text-muted-foreground">Irradiance:</span> {snapshot.irradianceWm2} W/m²</div>
            <div><span className="text-muted-foreground">Hash:</span> <code className="text-xs">{snapshot.rawResponseHash?.slice(0, 16)}…</code></div>
          </div>
        ) : (
          <div className="text-muted-foreground">No archived snapshot for this period.</div>
        )}
      </section>

      <section>
        <div className="font-semibold mb-1">2. Reconciliation</div>
        <div className="rounded border p-3 grid grid-cols-2 gap-2">
          <div><span className="text-muted-foreground">Expected:</span> {Number(run.expectedKwh).toFixed(3)} kWh</div>
          <div><span className="text-muted-foreground">Actual:</span> {Number(run.actualKwh).toFixed(3)} kWh</div>
          <div><span className="text-muted-foreground">Variance:</span> {Number(run.variancePct).toFixed(2)}%</div>
          <div><span className="text-muted-foreground">Tolerance:</span> ±{Number(run.tolerancePct).toFixed(2)}%</div>
          <div><span className="text-muted-foreground">Granularity:</span> {run.granularity}</div>
          <div><span className="text-muted-foreground">Status:</span> <VerificationStatusBadge status={run.status} /></div>
        </div>
      </section>

      <section>
        <div className="font-semibold mb-1">3. Price</div>
        <div className="rounded border p-3 grid grid-cols-2 gap-2">
          <div><span className="text-muted-foreground">$ / kWh:</span> ${Number(run.ppaRateUsdPerKwh).toFixed(6)}</div>
          <div><span className="text-muted-foreground">Source:</span> {run.ppaSource}</div>
          <div><span className="text-muted-foreground">Off-taker:</span> {run.offtakerClass}</div>
          <div><span className="text-muted-foreground">Plant use:</span> {run.plantUse}</div>
          <div className="col-span-2"><span className="text-muted-foreground">Gross revenue:</span> ${Number(run.grossRevenueUsd).toFixed(2)}</div>
        </div>
      </section>

      <section>
        <div className="font-semibold mb-1">4. Ledger</div>
        {transaction ? (
          <div className="rounded border p-3 space-y-2">
            <div><span className="text-muted-foreground">Tx:</span> <code className="text-xs">{transaction.id}</code></div>
            <div><span className="text-muted-foreground">Memo:</span> {transaction.memo}</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {postings.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell><code className="text-xs">{p.accountId.slice(0, 8)}</code></TableCell>
                    <TableCell>{p.direction}</TableCell>
                    <TableCell className="text-right">${Number(p.amount).toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-muted-foreground">Not yet settled.</div>
        )}
      </section>

      <section>
        <div className="font-semibold mb-1">5. Anomalies ({anomalies.length})</div>
        {anomalies.length === 0 ? (
          <div className="text-muted-foreground">None.</div>
        ) : (
          <div className="space-y-2">
            {anomalies.map((a) => (
              <div key={a.id} className="rounded border p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={a.severity} />
                  <span className="font-mono text-xs">{a.ruleCode}</span>
                  <span className="text-muted-foreground text-xs">
                    {JSON.stringify(a.detail).slice(0, 80)}
                  </span>
                </div>
                {a.clearedAt && <Badge variant="outline">Cleared</Badge>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="font-semibold mb-1">Evidence hash</div>
        <code className="text-xs break-all">{run.evidenceHash}</code>
      </section>
    </div>
  );
}

function ClearAnomalyDialog({ projectId, runId }: { projectId: string; runId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [force, setForce] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/projects/${projectId}/verification/runs/${runId}/clear`, {
        reason,
        force,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/verification/runs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/verification/summary`] });
      setOpen(false);
      setReason("");
      setForce(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`clear-${runId}`}>
          Clear
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear anomalies</DialogTitle>
          <DialogDescription>
            Clearing WARN flags is non-destructive. Use Force to clear BLOCK flags — this is logged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={force} onCheckedChange={(v) => setForce(Boolean(v))} />
            Force-clear BLOCK flags
          </label>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!reason || mutation.isPending}>
            Clear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualRunDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [granularity, setGranularity] = useState<"INTERVAL_15M" | "DAILY">("DAILY");
  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/projects/${projectId}/verification/run`, {
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        granularity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/verification/runs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/verification/summary`] });
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Manual run</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual verification run</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="from">From</Label>
            <Input id="from" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input id="to" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Granularity</Label>
            <div className="flex gap-3 mt-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={granularity === "DAILY"}
                  onChange={() => setGranularity("DAILY")}
                />
                Daily
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={granularity === "INTERVAL_15M"}
                  onChange={() => setGranularity("INTERVAL_15M")}
                />
                15-min intervals
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!from || !to || mutation.isPending}>
            Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminVerificationPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { data: summary } = useQuery<{
    countsByStatus: Record<string, number>;
    totalRuns30d: number;
    pctVerified30d: number;
    openAnomalyCount: number;
    lastSettledAt: string | null;
  }>({
    queryKey: [`/api/projects/${projectId}/verification/summary`],
    enabled: !!projectId,
  });

  const { data: runsData } = useQuery<{ runs: VerificationRun[] }>({
    queryKey: [`/api/projects/${projectId}/verification/runs`],
    enabled: !!projectId,
  });

  const runs = runsData?.runs ?? [];

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Verification</h1>
          <p className="text-sm text-muted-foreground">Project {projectId}</p>
        </div>
        <ManualRunDialog projectId={projectId!} />
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Verified (30d)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary?.pctVerified30d != null ? `${summary.pctVerified30d.toFixed(1)}%` : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total runs (30d)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{summary?.totalRuns30d ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Open anomalies</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{summary?.openAnomalyCount ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Last settled</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {summary?.lastSettledAt ? new Date(summary.lastSettledAt).toLocaleString() : "Never"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent verification runs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Granularity</TableHead>
                <TableHead className="text-right">Expected kWh</TableHead>
                <TableHead className="text-right">Actual kWh</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id} data-testid={`row-${r.id}`}>
                  <TableCell className="text-xs">{new Date(r.periodStart).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{r.granularity}</TableCell>
                  <TableCell className="text-right">{Number(r.expectedKwh).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(r.actualKwh).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(r.variancePct).toFixed(2)}%</TableCell>
                  <TableCell><VerificationStatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-xs">{r.ppaSource}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedRunId(r.id)}
                        data-testid={`view-${r.id}`}
                      >
                        View
                      </Button>
                      {(r.status === "FLAGGED" || r.status === "REJECTED") && (
                        <ClearAnomalyDialog projectId={projectId!} runId={r.id} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No verification runs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRunId} onOpenChange={(o) => !o && setSelectedRunId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Evidence chain</DialogTitle>
            <DialogDescription>
              Trace this verification run from irradiance → meter → reconciliation → price → ledger.
            </DialogDescription>
          </DialogHeader>
          {selectedRunId && projectId && (
            <EvidenceChainViewer runId={selectedRunId} projectId={projectId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
