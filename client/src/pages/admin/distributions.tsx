/**
 * Spec 17 — SPV distributions console.
 *
 * The operator surface for the waterfall engine: compute a run, read its full
 * trace, approve it as a named human, submit it, and watch the ITC recapture
 * window that outlives everyone's attention span.
 *
 * Deliberately blunt about state. A run that cannot execute says why, in the
 * gate's own words, rather than disabling a button silently.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileWarning,
  Landmark,
  Lock,
  ShieldAlert,
} from "lucide-react";

const money = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
};

const day = (value: string | Date | null | undefined) =>
  value ? new Date(value).toISOString().slice(0, 10) : "—";

const STATUS_TONE: Record<string, string> = {
  computed: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  submitted: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  settled: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  reversed: "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
};

interface SpvOverview {
  spv: { id: string; name: string; legalName: string; status: string };
  terms: {
    version: number;
    counselConfirmedAt: string | null;
    counselConfirmedBy: string | null;
    sourceDocumentPath: string;
  } | null;
  counselConfirmed: boolean;
  periods: {
    periodStart: string;
    periodEnd: string;
    closeStatus: string;
    closedBy: string | null;
    energyRevenue: string;
    totalOpex: string;
  }[];
  runs: {
    id: string;
    periodStart: string;
    status: string;
    distributableCash: string;
    totalDistributed: string;
    approvedBy: string | null;
    engineVersion: string;
  }[];
  engineVersion: string;
}

export default function AdminDistributions() {
  const params = useParams<{ spvId?: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [period, setPeriod] = useState("2026-01");
  const [reverseReason, setReverseReason] = useState("");

  const spvList = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/v1/spvs"],
    enabled: !params.spvId,
  });

  const spvId = params.spvId ?? spvList.data?.[0]?.id ?? null;
  const base = spvId ? `/api/v1/spv/${spvId}` : null;

  const overview = useQuery<SpvOverview>({
    queryKey: [base],
    enabled: Boolean(base),
  });

  const trace = useQuery<any>({
    queryKey: [`${base}/distributions/${selectedRunId}/trace`],
    enabled: Boolean(base && selectedRunId),
  });

  const capitalAccounts = useQuery<any>({
    queryKey: [`${base}/capital-accounts/summary`],
    enabled: Boolean(base),
  });

  const reserves = useQuery<any>({ queryKey: [`${base}/reserves`], enabled: Boolean(base) });
  const capTable = useQuery<any>({
    queryKey: [`${base}/cap-table/reconciliation`],
    enabled: Boolean(base),
  });
  const itc = useQuery<any>({
    queryKey: [`${base}/itc/recapture-exposure`],
    enabled: Boolean(base),
  });

  const invalidate = () => {
    globalQueryClient.invalidateQueries({ queryKey: [base] });
    queryClient.invalidateQueries({ queryKey: [`${base}/capital-accounts/summary`] });
    queryClient.invalidateQueries({ queryKey: [`${base}/reserves`] });
  };

  const onError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Request failed";
    toast({ title: "The engine refused", description: message, variant: "destructive" });
  };

  const closePeriod = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `${base}/periods/${period}/close`, {
        bankReconciledBy: "controller@ecoxchange.net",
      }),
    onSuccess: () => {
      toast({ title: `Period ${period} closed` });
      invalidate();
    },
    onError,
  });

  const compute = useMutation({
    mutationFn: async () => apiRequest("POST", `${base}/distributions/compute`, { period }),
    onSuccess: async (response: any) => {
      const body = await response.json();
      setSelectedRunId(body.run.id);
      toast({
        title: "Run computed",
        description: `${money(body.run.totalDistributed)} across the waterfall. Nothing has moved yet.`,
      });
      invalidate();
    },
    onError,
  });

  const approve = useMutation({
    mutationFn: async (runId: string) =>
      apiRequest("POST", `${base}/distributions/${runId}/approve`, {}),
    onSuccess: () => {
      toast({ title: "Approved", description: "Recorded against your account." });
      invalidate();
    },
    onError,
  });

  const submit = useMutation({
    mutationFn: async (runId: string) =>
      apiRequest("POST", `${base}/distributions/${runId}/submit`, {}),
    onSuccess: () => {
      toast({ title: "Submitted to the transfer agent" });
      invalidate();
    },
    onError,
  });

  const reverse = useMutation({
    mutationFn: async (runId: string) =>
      apiRequest("POST", `${base}/distributions/${runId}/reverse`, { reason: reverseReason }),
    onSuccess: () => {
      toast({ title: "Reversing run created", description: "History is intact; the correction is forward." });
      setReverseReason("");
      invalidate();
    },
    onError,
  });

  if (!spvId) {
    // An unreachable database and a genuinely empty SPV list look identical from
    // here, so distinguish them — otherwise an outage reads as "run the seed script".
    const listFailed = Boolean(spvList.error);
    return (
      <DashboardLayout title="Distributions" breadcrumbs={[{ label: "Admin", href: "/admin" }]}>
        <Card>
          <CardHeader>
            <CardTitle>{listFailed ? "Distributions unavailable" : "No SPV yet"}</CardTitle>
            <CardDescription>
              {listFailed ? (
                <>
                  The distribution engine is the one surface that reads from Postgres, and
                  the database is not reachable right now. Check{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/health</code> —
                  if <code className="rounded bg-muted px-1 py-0.5 text-xs">database</code> is{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">unreachable</code>, the
                  connection string is wrong or the database is paused. Every other admin
                  screen keeps working.
                </>
              ) : (
                <>
                  The distribution engine operates on SPVs. Seed one with{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    npx tsx scripts/seed-spec17-demo.ts
                  </code>
                  .
                </>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  const runs = overview.data?.runs ?? [];
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? runs[0] ?? null;

  return (
    <DashboardLayout
      title={overview.data?.spv.name ?? "Distributions"}
      description={overview.data?.spv.legalName}
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Distributions" }]}
    >
      <div className="space-y-6">
        {/* The gate that governs everything below it. */}
        {overview.data && !overview.data.counselConfirmed && (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertTitle>Waterfall terms are not confirmed by counsel</AlertTitle>
            <AlertDescription>
              No distribution can compute or execute against these terms. The database rejects it
              independently of this screen. Have counsel confirm{" "}
              {overview.data.terms?.sourceDocumentPath ?? "the operating agreement"} and record it on
              the terms row.
            </AlertDescription>
          </Alert>
        )}

        {capTable.data && !capTable.data.reconciled && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Cap table does not reconcile — runs are halted</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {capTable.data.discrepancies.map((d: string) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {itc.data?.alerts?.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ITC recapture exposure</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {itc.data.alerts.map((alert: string) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="runs">
          <TabsList>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="trace">Trace</TabsTrigger>
            <TabsTrigger value="capital">Capital accounts</TabsTrigger>
            <TabsTrigger value="reserves">Reserves</TabsTrigger>
            <TabsTrigger value="itc">ITC</TabsTrigger>
          </TabsList>

          {/* ── Runs ─────────────────────────────────────────────────────── */}
          <TabsContent value="runs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compute a period</CardTitle>
                <CardDescription>
                  A period must be closed before a run computes against it. Computing moves no
                  money — every run waits for a named human.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="period">Period</Label>
                  <Input
                    id="period"
                    value={period}
                    onChange={(event) => setPeriod(event.target.value)}
                    placeholder="2026-01"
                    className="w-40"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => closePeriod.mutate()}
                  disabled={closePeriod.isPending}
                >
                  {closePeriod.isPending ? "Closing…" : "Close period"}
                </Button>
                <Button onClick={() => compute.mutate()} disabled={compute.isPending}>
                  {compute.isPending ? "Computing…" : "Compute run"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribution runs</CardTitle>
                <CardDescription>Engine version {overview.data?.engineVersion}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Distributable</TableHead>
                      <TableHead className="text-right">Distributed</TableHead>
                      <TableHead>Approved by</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          No runs yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {runs.map((run) => (
                      <TableRow
                        key={run.id}
                        className={run.id === selectedRun?.id ? "bg-muted/50" : undefined}
                      >
                        <TableCell className="font-medium">{day(run.periodStart)}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_TONE[run.status] ?? ""} variant="secondary">
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(run.distributableCash)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(run.totalDistributed)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {run.approvedBy ?? "—"}
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedRunId(run.id)}
                          >
                            Trace
                          </Button>
                          {run.status === "computed" && (
                            <Button size="sm" onClick={() => approve.mutate(run.id)}>
                              Approve
                            </Button>
                          )}
                          {run.status === "approved" && (
                            <Button size="sm" onClick={() => submit.mutate(run.id)}>
                              Submit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {selectedRun && ["settled", "submitted", "failed"].includes(selectedRun.status) && (
              <Card>
                <CardHeader>
                  <CardTitle>Correct run {selectedRun.id.slice(0, 8)}</CardTitle>
                  <CardDescription>
                    An error found after settlement is corrected forward. A reversing run is created
                    and linked; nothing in history is edited.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={reverseReason}
                    onChange={(event) => setReverseReason(event.target.value)}
                    placeholder="State the reason for the reversal — this goes on the ledger."
                  />
                  <Button
                    variant="destructive"
                    disabled={!reverseReason.trim() || reverse.isPending}
                    onClick={() => reverse.mutate(selectedRun.id)}
                  >
                    Create reversing run
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Trace ────────────────────────────────────────────────────── */}
          <TabsContent value="trace" className="space-y-4">
            {!selectedRunId && (
              <Card>
                <CardContent className="py-8 text-muted-foreground">
                  Pick a run from the Runs tab to see its trace.
                </CardContent>
              </Card>
            )}

            {trace.data && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Pre-waterfall stack</CardTitle>
                    <CardDescription>
                      Verified production through to distributable cash. Every intermediate is
                      persisted, so this is the record rather than a re-derivation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {trace.data.preWaterfall.map((step: any) => (
                      <div
                        key={step.label}
                        className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                          step.sign === "=" ? "bg-muted font-semibold" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-3 text-muted-foreground">{step.sign}</span>
                          {step.label}
                        </span>
                        <span className="tabular-nums">{money(step.amount)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {trace.data.notes?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileWarning className="h-4 w-4" />
                        Why this period looks the way it does
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {trace.data.notes.map((note: any, index: number) => (
                          <li key={index} className="flex gap-2">
                            <Badge variant="outline">{note.code}</Badge>
                            <span className="text-muted-foreground">{note.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Waterfall tiers</CardTitle>
                    <CardDescription>
                      Demand, allocated and unmet for every tier. A partially-satisfied preferred
                      return is a claim on future cash and is shown as one.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Demand</TableHead>
                          <TableHead className="text-right">Allocated</TableHead>
                          <TableHead className="text-right">Unmet</TableHead>
                          <TableHead>Accrues</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trace.data.tiers.map((tier: any) => (
                          <TableRow key={tier.seq}>
                            <TableCell>{tier.seq}</TableCell>
                            <TableCell className="font-medium">{tier.type}</TableCell>
                            <TableCell>{tier.class ?? "all"}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {money(tier.demand)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {money(tier.allocated)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {Number(tier.unmet) > 0 ? (
                                <span className="text-amber-700 dark:text-amber-400">
                                  {money(tier.unmet)}
                                </span>
                              ) : (
                                money(tier.unmet)
                              )}
                            </TableCell>
                            <TableCell>
                              {tier.accrues ? (
                                <Badge variant="secondary">carries forward</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Member allocations</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Weighted units</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                          <TableHead className="text-right">Carried out</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trace.data.allocations.map((allocation: any) => (
                          <TableRow key={allocation.id}>
                            <TableCell className="font-medium">{allocation.memberName}</TableCell>
                            <TableCell>{allocation.memberClass}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {allocation.weightedUnits}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {money(allocation.grossAmount)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {money(allocation.netAmount)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {money(allocation.carriedForwardOut)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Separator className="my-4" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Terms version {trace.data.terms?.version}, confirmed by{" "}
                        {trace.data.terms?.counselConfirmedBy ?? "—"} on{" "}
                        {day(trace.data.terms?.counselConfirmedAt)}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {money(trace.data.totals.totalDistributed)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── Capital accounts ─────────────────────────────────────────── */}
          <TabsContent value="capital">
            <Card>
              <CardHeader>
                <CardTitle>Capital accounts</CardTitle>
                <CardDescription>
                  Book and tax are separate books and diverge from day one. These balances are
                  recomputed from the append-only ledger on every read.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Book (704(b))</TableHead>
                      <TableHead className="text-right">Tax basis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(capitalAccounts.data?.members ?? []).map((member: any) => (
                      <TableRow key={member.memberId}>
                        <TableCell className="font-medium">{member.legalName}</TableCell>
                        <TableCell>{member.memberClass}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {member.entryCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(member.bookBalance)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(member.taxBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Separator className="my-4" />
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Landmark className="h-4 w-4" />
                    SPV book equity
                  </span>
                  <span className="font-semibold tabular-nums">
                    {money(capitalAccounts.data?.spvBookEquity)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Reserves ─────────────────────────────────────────────────── */}
          <TabsContent value="reserves" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reserve accounts</CardTitle>
                <CardDescription>
                  Reserves fund before distributions, always. A distribution that starves a reserve
                  is a future capital call.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Target basis</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Priority</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Draws permitted for</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reserves.data?.accounts ?? []).map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.code}</TableCell>
                        <TableCell>{account.targetBasis}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {account.targetValue}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {account.fundingPriority}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(account.currentBalance)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {account.drawPermittedFor?.join(", ") || "none"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Movements</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance after</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reserves.data?.movements ?? []).map((movement: any) => (
                      <TableRow key={movement.id}>
                        <TableCell>{day(movement.occurredAt)}</TableCell>
                        <TableCell>
                          <Badge variant={movement.direction === "draw" ? "destructive" : "secondary"}>
                            {movement.direction}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(movement.amount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(movement.balanceAfter)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {movement.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ITC ──────────────────────────────────────────────────────── */}
          <TabsContent value="itc">
            <Card>
              <CardHeader>
                <CardTitle>ITC recapture exposure</CardTitle>
                <CardDescription>
                  The credit vests 20% a year over five years. This stays on screen for the whole
                  window — a recapture discovered late is a tax liability plus penalties, landing on
                  investors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">Total credit</div>
                    <div className="text-2xl font-semibold tabular-nums">
                      {money(itc.data?.totalCreditAmount)}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">Still unvested</div>
                    <div className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                      {money(itc.data?.totalUnvestedAmount)}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">Positions at risk</div>
                    <div className="text-2xl font-semibold tabular-nums">
                      {itc.data?.positionsAtRisk ?? 0}
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead className="text-right">Vested</TableHead>
                      <TableHead className="text-right">Unvested</TableHead>
                      <TableHead>Window ends</TableHead>
                      <TableHead className="text-right">Days left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(itc.data?.positions ?? []).map((position: any) => (
                      <TableRow key={position.positionId}>
                        <TableCell className="font-mono text-xs">
                          {position.positionId.slice(0, 8)}
                        </TableCell>
                        <TableCell>{position.treatment}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {position.vestedPct}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(position.unvestedAmount)}
                        </TableCell>
                        <TableCell>{day(position.recapturePeriodEnds)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {position.atRisk ? (
                            <span className="flex items-center justify-end gap-1">
                              <Clock className="h-3 w-3" />
                              {position.daysRemaining}
                            </span>
                          ) : (
                            <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground">
          Tax allocation and ITC treatment require CPA review; waterfall terms require counsel
          confirmation. This console shows machinery, not tax positions.{" "}
          <Link href="/admin" className="underline">
            Back to admin
          </Link>
          <ArrowRight className="ml-1 inline h-3 w-3" />
        </p>
      </div>
    </DashboardLayout>
  );
}
