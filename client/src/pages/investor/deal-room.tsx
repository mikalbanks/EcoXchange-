import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { investorInterestFormSchema } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { YieldDashboard } from "@/components/yield-dashboard";
import { AIPredictionCard } from "@/components/ai-prediction";
import { ScadaSummaryCards, ProductionChart, ForecastChart, ForecastVsActualChart, RevenueBridgeWaterfall, DistributionWaterfall, HealthBadge } from "@/components/scada";
import {
  AlertTriangle,
  Shield,
  MapPin,
  Zap,
  Building,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Send,
  Info,
  TrendingUp,
} from "lucide-react";

type InterestFormValues = z.infer<typeof investorInterestFormSchema>;

interface DealRoomData {
  project: {
    id: string;
    name: string;
    technology: string;
    stage: string;
    state: string;
    county: string;
    capacityMW: string | null;
    summary: string | null;
    offtakerType: string;
    interconnectionStatus: string;
    permittingStatus: string;
    siteControlStatus: string;
    feocAttested: boolean;
  };
  readinessScore: {
    score: number;
    rating: string;
    reasons: string | null;
  } | null;
  capitalStack: {
    totalCapex: string | null;
    taxCreditType: string;
    taxCreditEstimated: string | null;
    taxCreditTransferabilityReady: boolean;
    equityNeeded: string | null;
    debtPlaceholder: string | null;
  } | null;
  documents: Array<{
    id: string;
    type: string;
    filename: string;
    createdAt: string;
  }>;
  checklist: Array<{
    id: string;
    key: string;
    label: string;
    required: boolean;
    status: string;
  }>;
  developer: {
    name: string;
    orgName: string | null;
  } | null;
  myInterest: {
    amountIntent: string | null;
    structurePreference: string;
    timeline: string;
    message: string | null;
    status: string;
    createdAt: string;
  } | null;
}

function formatCurrency(value: string | number | null): string {
  if (!value) return "$0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatTimeline(timeline: string): string {
  switch (timeline) {
    case "IMMEDIATE": return "Immediate";
    case "DAYS_30_60": return "30-60 Days";
    case "DAYS_60_90": return "60-90 Days";
    case "UNKNOWN": return "Unknown";
    default: return timeline;
  }
}

function CapitalBar({ label, value, total, colorClass }: { label: string; value: number; total: number; colorClass: string }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatCurrency(value)} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function InvestorDealRoom() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const isVerified = user?.personaStatus === "completed";

  const { data, isLoading, error } = useQuery<DealRoomData>({
    queryKey: ["/api/investor/deals", id],
  });

  const form = useForm<InterestFormValues>({
    resolver: zodResolver(investorInterestFormSchema),
    defaultValues: {
      amountIntent: "",
      structurePreference: "UNKNOWN",
      timeline: "UNKNOWN",
      message: "",
    },
  });

  const submitInterest = useMutation({
    mutationFn: async (values: InterestFormValues) => {
      await apiRequest("POST", `/api/investor/deals/${id}/interest`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investor/deals", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/investor/interests"] });
      toast({
        title: "Interest Submitted",
        description: "Your expression of interest has been recorded.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Submission Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: InterestFormValues) {
    submitInterest.mutate(values);
  }

  if (!termsAccepted) {
    return (
      <DashboardLayout
        title="Offering Detail"
        breadcrumbs={[
          { label: "Overview", href: "/investor" },
          { label: "Offerings", href: "/investor/deals" },
          { label: "Offering Detail" },
        ]}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <Shield className="h-12 w-12 text-primary mx-auto mb-3" />
              <CardTitle className="text-xl" data-testid="text-terms-gate-title">Offering Terms of Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground" data-testid="text-terms-content">
                By accessing this offering, you acknowledge that EcoXchange is a digital securities platform for renewable energy assets. Securities are structured as SPV membership interests under Reg D 506(c), asset-backed and yield-generating. All participants must complete KYC/AML verification. Secondary trading is currently simulated and will become compliant live trading in later phases. Investment involves risk, including possible loss of principal.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setTermsAccepted(true)}
                  data-testid="button-accept-terms"
                >
                  I Accept
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout
        title="Offering Detail"
        breadcrumbs={[
          { label: "Overview", href: "/investor" },
          { label: "Offerings", href: "/investor/deals" },
          { label: "Loading..." },
        ]}
      >
        <div className="space-y-6">
          <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          <Card><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          <Card><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout
        title="Offering Detail"
        breadcrumbs={[
          { label: "Overview", href: "/investor" },
          { label: "Offerings", href: "/investor/deals" },
          { label: "Error" },
        ]}
      >
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3 opacity-50" />
            <p className="text-destructive" data-testid="text-error-message">
              {error ? (error as Error).message : "Failed to load deal room"}
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const { project, readinessScore, capitalStack, documents, checklist, developer, myInterest } = data;
  const totalCapex = parseFloat(capitalStack?.totalCapex || "0") || 0;
  const taxCreditEstimated = parseFloat(capitalStack?.taxCreditEstimated || "0") || 0;
  const equityNeeded = parseFloat(capitalStack?.equityNeeded || "0") || 0;
  const debtPlaceholder = parseFloat(capitalStack?.debtPlaceholder || "0") || 0;

  const reasons = readinessScore?.reasons
    ? (typeof readinessScore.reasons === "string" ? readinessScore.reasons.split("\n").filter(Boolean) : [])
    : [];

  const verifiedCount = checklist.filter((c) => c.status === "VERIFIED").length;
  const uploadedCount = checklist.filter((c) => c.status === "UPLOADED").length;
  const missingCount = checklist.filter((c) => c.status === "MISSING").length;

  return (
    <DashboardLayout
      title={project.name}
      description="Offering Detail"
      breadcrumbs={[
        { label: "Overview", href: "/investor" },
        { label: "Offerings", href: "/investor/deals" },
        { label: project.name },
      ]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-4 w-4" />
              Project Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Project Name</span>
                  <p className="font-medium" data-testid="text-project-name">{project.name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Technology</span>
                  <p className="font-medium" data-testid="text-project-technology">{project.technology.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Stage</span>
                  <p className="font-medium" data-testid="text-project-stage">{project.stage.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Location</span>
                  <p className="font-medium flex items-center gap-1" data-testid="text-project-location">
                    <MapPin className="h-3.5 w-3.5" />
                    {project.county}, {project.state}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Capacity</span>
                  <p className="font-medium flex items-center gap-1" data-testid="text-project-capacity">
                    <Zap className="h-3.5 w-3.5" />
                    {project.capacityMW || "N/A"} MW
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Offtaker Type</span>
                  <p className="font-medium" data-testid="text-project-offtaker">{project.offtakerType.replace(/_/g, " ")}</p>
                </div>
                {developer && (
                  <div>
                    <span className="text-sm text-muted-foreground">Developer</span>
                    <p className="font-medium flex items-center gap-1" data-testid="text-developer-name">
                      <Building className="h-3.5 w-3.5" />
                      {developer.orgName || developer.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {project.summary && (
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">Summary</span>
                <p className="mt-1 text-sm" data-testid="text-project-summary">{project.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {readinessScore && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Readiness Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="text-3xl font-bold" data-testid="text-readiness-score">{readinessScore.score}</div>
                <StatusBadge status={readinessScore.rating} type="readiness" />
              </div>
              {reasons.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Assessment Details</span>
                  <ul className="space-y-1.5">
                    {reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-reason-${i}`}>
                        <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {capitalStack && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Capital Stack
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm font-medium pb-2 border-b border-border">
                <span>Total CapEx</span>
                <span data-testid="text-total-capex">{formatCurrency(totalCapex)}</span>
              </div>
              <CapitalBar
                label="Tax Credit Estimated"
                value={taxCreditEstimated}
                total={totalCapex}
                colorClass="bg-emerald-500"
              />
              <CapitalBar
                label="Equity Needed"
                value={equityNeeded}
                total={totalCapex}
                colorClass="bg-primary"
              />
              {debtPlaceholder > 0 && (
                <CapitalBar
                  label="Debt"
                  value={debtPlaceholder}
                  total={totalCapex}
                  colorClass="bg-blue-500"
                />
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                <span>Tax Credit Type: {capitalStack.taxCreditType}</span>
                {capitalStack.taxCreditTransferabilityReady && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Transfer Ready
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              SCADA Performance
            </h3>
            <HealthBadge projectId={id!} size="md" />
          </div>
          <ScadaSummaryCards projectId={id!} showProvenance />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProductionChart projectId={id!} />
            <ForecastChart projectId={id!} />
          </div>
          <ForecastVsActualChart projectId={id!} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueBridgeWaterfall projectId={id!} showProvenance />
            <DistributionWaterfall projectId={id!} showProvenance />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4" />
            Yield Performance
          </h3>
          <YieldDashboard projectId={id!} />
        </div>

        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4" />
            AI Financial Prediction
          </h3>
          <AIPredictionCard projectId={id!} projectName={project.name} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Data Room
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                {verifiedCount} Verified
              </span>
              <span className="flex items-center gap-1 text-blue-400">
                <Clock className="h-3.5 w-3.5" />
                {uploadedCount} Uploaded
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="h-3.5 w-3.5" />
                {missingCount} Missing
              </span>
            </div>

            {checklist.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Checklist</span>
                <div className="space-y-1.5">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30" data-testid={`checklist-item-${item.key}`}>
                      <span>{item.label}</span>
                      <StatusBadge status={item.status} type="checklist" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {documents.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Documents ({documents.length})</span>
                <div className="space-y-1.5">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30" data-testid={`document-${doc.id}`}>
                      <span className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        {doc.filename}
                      </span>
                      <span className="text-xs text-muted-foreground">{doc.type.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-4 w-4" />
              {myInterest ? "Your Investment" : "Invest in This Offering"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isVerified && !myInterest ? (
              <div className="flex items-center gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/30" data-testid="banner-verify-to-invest">
                <Shield className="h-5 w-5 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-400">KYC/AML Verification Required</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Complete KYC/AML verification from your dashboard before investing in digital securities.</p>
                </div>
              </div>
            ) : myInterest ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <StatusBadge status={myInterest.status} type="interest" />
                  <span className="text-sm text-muted-foreground">
                    Submitted {new Date(myInterest.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <p className="font-medium" data-testid="text-my-interest-amount">{formatCurrency(myInterest.amountIntent)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Structure</span>
                    <p className="font-medium" data-testid="text-my-interest-structure">{myInterest.structurePreference.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Timeline</span>
                    <p className="font-medium" data-testid="text-my-interest-timeline">{formatTimeline(myInterest.timeline)}</p>
                  </div>
                </div>
                {myInterest.message && (
                  <div>
                    <span className="text-sm text-muted-foreground">Message</span>
                    <p className="text-sm mt-1" data-testid="text-my-interest-message">{myInterest.message}</p>
                  </div>
                )}
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amountIntent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter amount in USD"
                            min="10000"
                            step="1000"
                            {...field}
                            data-testid="input-amount-intent"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          {equityNeeded > 0
                            ? `Equity target: ${formatCurrency(equityNeeded)}. Enter your intended investment amount in USD.`
                            : "Enter your intended investment amount in USD."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="structurePreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Structure Preference</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-structure-preference">
                              <SelectValue placeholder="Select preference" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EQUITY">Equity</SelectItem>
                            <SelectItem value="PREFERRED">Preferred</SelectItem>
                            <SelectItem value="UNKNOWN">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timeline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timeline</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-timeline">
                              <SelectValue placeholder="Select timeline" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                            <SelectItem value="DAYS_30_60">30-60 Days</SelectItem>
                            <SelectItem value="DAYS_60_90">60-90 Days</SelectItem>
                            <SelectItem value="UNKNOWN">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any additional notes or questions..."
                            className="resize-none"
                            {...field}
                            data-testid="textarea-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={submitInterest.isPending}
                    className="gap-2"
                    data-testid="button-submit-interest"
                  >
                    <Send className="h-4 w-4" />
                    {submitInterest.isPending ? "Submitting..." : "Submit Expression of Interest"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
