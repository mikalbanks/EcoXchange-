import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { YieldDashboard } from "@/components/yield-dashboard";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
  FileText,
  Printer,
  User,
  Building,
  Mail,
  TrendingUp,
} from "lucide-react";
import type {
  Project,
  ReadinessScore,
  CapitalStack,
  DataRoomChecklistItem,
  Document,
  InvestorInterest,
  ProjectApprovalLog,
  User as UserType,
} from "@shared/schema";

interface ProjectReviewData {
  project: Project;
  readinessScore: ReadinessScore | null;
  capitalStack: CapitalStack | null;
  checklist: DataRoomChecklistItem[];
  documents: Document[];
  interests: Array<InvestorInterest & { investorName?: string; investorEmail?: string }>;
  logs: Array<ProjectApprovalLog & { adminName?: string }>;
  developer: UserType;
}

type ActionType = "APPROVE" | "REJECT" | "REQUEST_CHANGES";

export default function AdminProjectReview() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [actionDialog, setActionDialog] = useState<ActionType | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [overrideScore, setOverrideScore] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");

  const { data, isLoading, error } = useQuery<ProjectReviewData>({
    queryKey: ["/api/admin/projects", id],
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, notes }: { action: ActionType; notes: string }) => {
      const res = await apiRequest("POST", `/api/admin/projects/${id}/action`, { action, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Action completed", description: `Project has been updated.` });
      setActionDialog(null);
      setActionNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async ({ score, notes }: { score: number; notes: string }) => {
      const res = await apiRequest("POST", `/api/admin/projects/${id}/override-score`, { score, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      toast({ title: "Score overridden", description: "Readiness score has been updated." });
      setOverrideScore("");
      setOverrideNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAction = () => {
    if (!actionDialog) return;
    actionMutation.mutate({ action: actionDialog, notes: actionNotes });
  };

  const handleOverride = () => {
    const score = parseInt(overrideScore);
    if (isNaN(score) || score < 0 || score > 100) {
      toast({ title: "Invalid score", description: "Score must be between 0 and 100.", variant: "destructive" });
      return;
    }
    overrideMutation.mutate({ score, notes: overrideNotes });
  };

  const getActionLabel = (action: ActionType) => {
    switch (action) {
      case "APPROVE": return "Approve Project";
      case "REJECT": return "Reject Project";
      case "REQUEST_CHANGES": return "Request Changes";
    }
  };

  if (error) {
    return (
      <DashboardLayout
        title="Project Review"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Review Queue", href: "/admin/projects" },
          { label: "Error" },
        ]}
      >
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive" data-testid="text-error">
              Failed to load project details. Please try again later.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout
        title="Project Review"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Review Queue", href: "/admin/projects" },
          { label: "Loading..." },
        ]}
      >
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  const { project, readinessScore, capitalStack, checklist, documents, interests, logs, developer } = data;

  return (
    <DashboardLayout
      title={project.name}
      description={`${project.technology.replace(/_/g, " ")} | ${project.state}, ${project.county}`}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Review Queue", href: "/admin/projects" },
        { label: project.name },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/projects/${id}/export`}>
            <Button variant="outline" className="gap-2" data-testid="button-export-packet">
              <Printer className="h-4 w-4" />
              Export Packet
            </Button>
          </Link>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setActionDialog("REQUEST_CHANGES")}
            data-testid="button-request-changes"
          >
            <RotateCcw className="h-4 w-4" />
            Request Changes
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setActionDialog("REJECT")}
            data-testid="button-reject"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
          <Button
            className="gap-2"
            onClick={() => setActionDialog("APPROVE")}
            data-testid="button-approve"
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Project Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1" data-testid="text-project-status">
                    <StatusBadge status={project.status} type="project" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Technology</Label>
                  <p className="text-sm mt-1" data-testid="text-project-technology">
                    {project.technology.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Stage</Label>
                  <p className="text-sm mt-1" data-testid="text-project-stage">
                    {project.stage.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Capacity</Label>
                  <p className="text-sm mt-1" data-testid="text-project-capacity">
                    {project.capacityMW ? `${project.capacityMW} MW` : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <p className="text-sm mt-1" data-testid="text-project-location">
                    {project.state}, {project.county}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Offtaker Type</Label>
                  <p className="text-sm mt-1" data-testid="text-project-offtaker">
                    {project.offtakerType.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Interconnection</Label>
                  <p className="text-sm mt-1" data-testid="text-project-interconnection">
                    {project.interconnectionStatus.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Permitting</Label>
                  <p className="text-sm mt-1" data-testid="text-project-permitting">
                    {project.permittingStatus.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Site Control</Label>
                  <p className="text-sm mt-1" data-testid="text-project-site-control">
                    {project.siteControlStatus.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">FEOC Attested</Label>
                  <p className="text-sm mt-1" data-testid="text-project-feoc">
                    {project.feocAttested ? "Yes" : "No"}
                  </p>
                </div>
              </div>
              {project.summary && (
                <div className="mt-4">
                  <Label className="text-xs text-muted-foreground">Summary</Label>
                  <p className="text-sm mt-1" data-testid="text-project-summary">
                    {project.summary}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Issuer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm" data-testid="text-developer-name">
                  {developer.name}
                </span>
              </div>
              {developer.orgName && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm" data-testid="text-developer-org">
                    {developer.orgName}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm" data-testid="text-developer-email">
                  {developer.email}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Readiness Score</CardTitle>
          </CardHeader>
          <CardContent>
            {readinessScore ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-3xl font-bold" data-testid="text-readiness-score">
                    {readinessScore.score}
                  </div>
                  <StatusBadge status={readinessScore.rating} type="readiness" />
                  {readinessScore.overriddenByAdmin && (
                    <span className="text-xs text-muted-foreground">(Admin Override)</span>
                  )}
                </div>
                {readinessScore.reasons && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Reasons</Label>
                    <p className="text-sm mt-1" data-testid="text-readiness-reasons">
                      {readinessScore.reasons}
                    </p>
                  </div>
                )}
                {readinessScore.flags && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Flags</Label>
                    <p className="text-sm mt-1" data-testid="text-readiness-flags">
                      {readinessScore.flags}
                    </p>
                  </div>
                )}
                {readinessScore.overrideNotes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Override Notes</Label>
                    <p className="text-sm mt-1" data-testid="text-override-notes">
                      {readinessScore.overrideNotes}
                    </p>
                  </div>
                )}
                <Separator />
                <div>
                  <CardDescription className="mb-3">Override Readiness Score</CardDescription>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <Label htmlFor="override-score" className="text-xs">Score (0-100)</Label>
                      <Input
                        id="override-score"
                        type="number"
                        min={0}
                        max={100}
                        value={overrideScore}
                        onChange={(e) => setOverrideScore(e.target.value)}
                        className="w-24 mt-1"
                        data-testid="input-override-score"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <Label htmlFor="override-notes" className="text-xs">Notes</Label>
                      <Input
                        id="override-notes"
                        value={overrideNotes}
                        onChange={(e) => setOverrideNotes(e.target.value)}
                        placeholder="Reason for override"
                        className="mt-1"
                        data-testid="input-override-notes"
                      />
                    </div>
                    <Button
                      onClick={handleOverride}
                      disabled={overrideMutation.isPending || !overrideScore}
                      data-testid="button-override-score"
                    >
                      {overrideMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Override"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-no-readiness">
                No readiness score calculated yet.
              </p>
            )}
          </CardContent>
        </Card>

        {capitalStack && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Capital Stack</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Total CAPEX</Label>
                  <p className="text-sm font-medium mt-1" data-testid="text-total-capex">
                    ${Number(capitalStack.totalCapex ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tax Credit Type</Label>
                  <p className="text-sm mt-1" data-testid="text-tax-credit-type">
                    {capitalStack.taxCreditType}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tax Credit Estimated</Label>
                  <p className="text-sm mt-1" data-testid="text-tax-credit-estimated">
                    ${Number(capitalStack.taxCreditEstimated ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Transferability Ready</Label>
                  <p className="text-sm mt-1" data-testid="text-transferability-ready">
                    {capitalStack.taxCreditTransferabilityReady ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Equity Needed</Label>
                  <p className="text-sm mt-1" data-testid="text-equity-needed">
                    ${Number(capitalStack.equityNeeded ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Debt Placeholder</Label>
                  <p className="text-sm mt-1" data-testid="text-debt-placeholder">
                    ${Number(capitalStack.debtPlaceholder ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              {capitalStack.notes && (
                <div className="mt-4">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1" data-testid="text-capital-notes">
                    {capitalStack.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4" />
            Yield Performance
          </h3>
          <YieldDashboard projectId={id!} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <CardDescription className="mb-3">Checklist</CardDescription>
              {checklist.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checklist.map((item) => (
                      <TableRow key={item.id} data-testid={`row-checklist-${item.id}`}>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell>{item.required ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} type="checklist" />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No checklist items.</p>
              )}
            </div>

            <Separator />

            <div>
              <CardDescription className="mb-3">Documents</CardDescription>
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border"
                      data-testid={`row-document-${doc.id}`}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.type.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Investment Commitments</CardTitle>
          </CardHeader>
          <CardContent>
            {interests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Structure</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interests.map((interest) => (
                    <TableRow key={interest.id} data-testid={`row-interest-${interest.id}`}>
                      <TableCell>
                        <div>
                          <span className="text-sm font-medium">
                            {interest.investorName ?? "Unknown"}
                          </span>
                          {interest.investorEmail && (
                            <span className="block text-xs text-muted-foreground">
                              {interest.investorEmail}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-interest-amount-${interest.id}`}>
                        ${Number(interest.amountIntent ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {interest.structurePreference.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {interest.timeline.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={interest.status} type="interest" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-no-interests">
                No investor interest yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Approval Log</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-border"
                    data-testid={`row-log-${log.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={log.action} type="project" />
                        <span className="text-sm text-muted-foreground">
                          by {log.adminName ?? "Admin"}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-sm mt-1">{log.notes}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-no-logs">
                No approval history yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={actionDialog !== null} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog ? getActionLabel(actionDialog) : ""}</DialogTitle>
            <DialogDescription>
              {actionDialog === "APPROVE" && "This will approve the project and make it visible to investors."}
              {actionDialog === "REJECT" && "This will reject the project submission. The developer will be notified."}
              {actionDialog === "REQUEST_CHANGES" && "Request the developer to make changes before resubmitting."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="action-notes">Notes</Label>
            <Textarea
              id="action-notes"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Add notes for the developer..."
              className="mt-1"
              data-testid="input-action-notes"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setActionDialog(null)}
              data-testid="button-cancel-action"
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog === "REJECT" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={actionMutation.isPending}
              data-testid="button-confirm-action"
            >
              {actionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
