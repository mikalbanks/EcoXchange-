import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Sun,
  Battery,
  MapPin,
  Gauge,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadinessScore {
  id: string;
  score: number;
  rating: string;
  reasons: string[];
  flags: Record<string, boolean>;
  overriddenByAdmin: boolean;
}

interface CapitalStack {
  id: string;
  totalCapex: string | null;
  taxCreditType: string;
  taxCreditEstimated: string | null;
  equityNeeded: string | null;
  debtPlaceholder: string | null;
}

interface ChecklistItem {
  id: string;
  key: string;
  label: string;
  required: boolean;
  status: string;
}

interface DocumentItem {
  id: string;
  type: string;
  filename: string;
  createdAt: string;
}

interface Interest {
  id: string;
  investorId: string;
  investorName?: string;
  amountIntent: string | null;
  structurePreference: string;
  timeline: string;
  message: string | null;
  status: string;
  createdAt: string;
}

interface ProjectDetailData {
  project: {
    id: string;
    name: string;
    technology: string;
    stage: string;
    state: string;
    county: string;
    capacityMW: string | null;
    status: string;
  };
  readinessScore: ReadinessScore | null;
  capitalStack: CapitalStack | null;
  checklist: ChecklistItem[];
  documents: DocumentItem[];
  interests: Interest[];
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "$0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0";
  return `$${num.toLocaleString()}`;
}

function formatLabel(s: string) {
  return s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [docType, setDocType] = useState("");
  const [docFilename, setDocFilename] = useState("");

  const { data, isLoading, error } = useQuery<ProjectDetailData>({
    queryKey: ["/api/developer/projects", id],
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (payload: { type: string; filename: string }) => {
      const res = await apiRequest("POST", `/api/developer/projects/${id}/documents`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer/projects", id] });
      setDocType("");
      setDocFilename("");
      toast({ title: "Document added", description: "Document has been added to the data room." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const interestMutation = useMutation({
    mutationFn: async ({ interestId, status }: { interestId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/developer/interests/${interestId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer/projects", id] });
      toast({ title: "Interest updated", description: "Investor interest status has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleAddDocument() {
    if (!docType || !docFilename.trim()) return;
    uploadDocMutation.mutate({ type: docType, filename: docFilename.trim() });
  }

  if (isLoading) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Issuer", href: "/developer" },
          { label: "Loading..." },
        ]}
      >
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Issuer", href: "/developer" },
          { label: "Not Found" },
        ]}
      >
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground" data-testid="text-error">
              {error ? (error as Error).message : "Project not found"}
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const { project, readinessScore, capitalStack, checklist, documents, interests } = data;

  const TechIcon = project.technology === "SOLAR_STORAGE" ? Battery : Sun;

  const ratingColorMap: Record<string, string> = {
    GREEN: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
    YELLOW: "bg-amber-500/20 text-amber-400 border-amber-500/50",
    RED: "bg-red-500/20 text-red-400 border-red-500/50",
  };

  const totalCapex = parseFloat(capitalStack?.totalCapex || "0") || 0;
  const taxCredit = parseFloat(capitalStack?.taxCreditEstimated || "0") || 0;
  const equityNeeded = parseFloat(capitalStack?.equityNeeded || "0") || 0;
  const debt = parseFloat(capitalStack?.debtPlaceholder || "0") || 0;

  const stackItems = [
    { label: "Total CapEx", value: totalCapex, color: "bg-primary" },
    { label: "Tax Credit", value: taxCredit, color: "bg-emerald-500" },
    { label: "Equity Needed", value: equityNeeded, color: "bg-amber-500" },
    { label: "Debt", value: debt, color: "bg-blue-500" },
  ];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Issuer", href: "/developer" },
        { label: project.name },
      ]}
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 text-primary">
                <TechIcon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold" data-testid="text-project-name">
                    {project.name}
                  </h1>
                  <StatusBadge status={project.status} type="project" />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5" data-testid="text-technology">
                    <TechIcon className="h-3.5 w-3.5" />
                    {formatLabel(project.technology)}
                  </span>
                  <span className="flex items-center gap-1.5" data-testid="text-location">
                    <MapPin className="h-3.5 w-3.5" />
                    {project.county}, {project.state}
                  </span>
                  {project.capacityMW && (
                    <span className="flex items-center gap-1.5" data-testid="text-capacity">
                      <Gauge className="h-3.5 w-3.5" />
                      {project.capacityMW} MW
                    </span>
                  )}
                  <span data-testid="text-stage">
                    Stage: {formatLabel(project.stage)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Readiness Score</CardTitle>
            </CardHeader>
            <CardContent>
              {readinessScore ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex items-center justify-center w-20 h-20 rounded-full border-4 text-2xl font-bold",
                        ratingColorMap[readinessScore.rating] || "bg-muted text-muted-foreground border-muted"
                      )}
                      data-testid="badge-readiness-score"
                    >
                      {readinessScore.score}
                    </div>
                    <div>
                      <StatusBadge status={readinessScore.rating} type="readiness" />
                      {readinessScore.overriddenByAdmin && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Overridden by admin
                        </p>
                      )}
                    </div>
                  </div>
                  {readinessScore.reasons && readinessScore.reasons.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Reasons</p>
                      <ul className="space-y-1">
                        {readinessScore.reasons.map((reason, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                            data-testid={`text-reason-${idx}`}
                          >
                            <span className="shrink-0 mt-0.5">-</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No readiness score available yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Capital Stack</CardTitle>
            </CardHeader>
            <CardContent>
              {capitalStack ? (
                <div className="space-y-4">
                  {stackItems.map((item) => {
                    const percentage = totalCapex > 0 ? (item.value / totalCapex) * 100 : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium" data-testid={`text-stack-${item.label.toLowerCase().replace(/\s/g, "-")}`}>
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", item.color)}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No capital stack data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Room Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {checklist.length > 0 ? (
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                    data-testid={`checklist-item-${item.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {item.status === "VERIFIED" ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : item.status === "UPLOADED" ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        {item.required && (
                          <p className="text-xs text-muted-foreground">Required</p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={item.status} type="checklist" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No checklist items</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[160px]">
                  <Label htmlFor="upload-doc-type">Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger data-testid="select-upload-doc-type" id="upload-doc-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SITE_CONTROL">Site Control</SelectItem>
                      <SelectItem value="INTERCONNECTION">Interconnection</SelectItem>
                      <SelectItem value="PERMITS">Permits</SelectItem>
                      <SelectItem value="EPC">EPC</SelectItem>
                      <SelectItem value="FINANCIAL_MODEL">Financial Model</SelectItem>
                      <SelectItem value="INSURANCE">Insurance</SelectItem>
                      <SelectItem value="FEOC_ATTESTATION">FEOC Attestation</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <Label htmlFor="upload-doc-filename">Filename</Label>
                  <Input
                    id="upload-doc-filename"
                    placeholder="e.g., site-lease.pdf"
                    value={docFilename}
                    onChange={(e) => setDocFilename(e.target.value)}
                    data-testid="input-upload-doc-filename"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddDocument}
                  disabled={!docType || !docFilename.trim() || uploadDocMutation.isPending}
                  data-testid="button-upload-document"
                >
                  {uploadDocMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>

              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                      data-testid={`document-item-${doc.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.filename}</p>
                          <p className="text-xs text-muted-foreground">{formatLabel(doc.type)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents uploaded yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Investment Commitments
            </CardTitle>
            {interests.length > 0 && (
              <span className="text-sm text-muted-foreground" data-testid="text-interest-count">
                {interests.length} commitment{interests.length !== 1 ? "s" : ""}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {interests.length > 0 ? (
              <div className="space-y-4">
                {interests.map((interest) => (
                  <div
                    key={interest.id}
                    className="p-4 rounded-lg border border-border space-y-3"
                    data-testid={`interest-item-${interest.id}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium" data-testid={`text-investor-name-${interest.id}`}>
                          {interest.investorName || "Investor"}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                          {interest.amountIntent && (
                            <span className="flex items-center gap-1" data-testid={`text-interest-amount-${interest.id}`}>
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatCurrency(interest.amountIntent)}
                            </span>
                          )}
                          <span data-testid={`text-interest-structure-${interest.id}`}>
                            {formatLabel(interest.structurePreference)}
                          </span>
                          <span data-testid={`text-interest-timeline-${interest.id}`}>
                            {formatLabel(interest.timeline)}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={interest.status} type="interest" />
                    </div>

                    {interest.message && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-interest-message-${interest.id}`}>
                        {interest.message}
                      </p>
                    )}

                    {interest.status === "SUBMITTED" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            interestMutation.mutate({
                              interestId: interest.id,
                              status: "ACCEPTED_BY_DEV",
                            })
                          }
                          disabled={interestMutation.isPending}
                          className="gap-1"
                          data-testid={`button-accept-interest-${interest.id}`}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            interestMutation.mutate({
                              interestId: interest.id,
                              status: "DECLINED_BY_DEV",
                            })
                          }
                          disabled={interestMutation.isPending}
                          className="gap-1"
                          data-testid={`button-decline-interest-${interest.id}`}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No investment commitments yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
