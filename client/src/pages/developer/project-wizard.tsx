import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { IdentityVerificationCard } from "@/components/identity-verification-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, FileText, X, HelpCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  projectWizardStep1Schema,
  projectWizardStep2Schema,
  projectWizardStep3Schema,
} from "@shared/schema";
import { cn } from "@/lib/utils";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const STEPS = [
  { number: 1, label: "Basics" },
  { number: 2, label: "Status" },
  { number: 3, label: "Financials" },
  { number: 4, label: "Documents" },
  { number: 5, label: "Review" },
];

interface PendingDocument {
  type: string;
  filename: string;
}

type Step1Values = z.infer<typeof projectWizardStep1Schema>;
type Step2Values = z.infer<typeof projectWizardStep2Schema>;
type Step3Values = z.infer<typeof projectWizardStep3Schema>;

export default function ProjectWizard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isVerified = user?.personaStatus === "completed";
  const [currentStep, setCurrentStep] = useState(1);
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
  const [docType, setDocType] = useState("");
  const [docFilename, setDocFilename] = useState("");

  const step1Form = useForm<Step1Values>({
    resolver: zodResolver(projectWizardStep1Schema),
    defaultValues: {
      name: "",
      technology: "SOLAR",
      stage: "PRE_NTP",
      state: "",
      county: "",
      capacityMW: "",
    },
  });

  const step2Form = useForm<Step2Values>({
    resolver: zodResolver(projectWizardStep2Schema),
    defaultValues: {
      siteControlStatus: "NONE",
      interconnectionStatus: "UNKNOWN",
      permittingStatus: "UNKNOWN",
      offtakerType: "C_AND_I",
      feocAttested: false,
    },
  });

  const step3Form = useForm<Step3Values>({
    resolver: zodResolver(projectWizardStep3Schema),
    defaultValues: {
      totalCapex: "",
      taxCreditType: "UNKNOWN",
      taxCreditEstimated: "",
      taxCreditTransferabilityReady: false,
      equityTarget: "",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (payload: { step1: Step1Values; step2: Step2Values; step3: Step3Values }) => {
      const res = await apiRequest("POST", "/api/developer/projects", payload);
      return res.json();
    },
    onSuccess: async (data) => {
      const failedDocs: string[] = [];
      for (const doc of pendingDocs) {
        try {
          await apiRequest("POST", `/api/developer/projects/${data.id}/documents`, doc);
        } catch (err) {
          console.error("Failed to upload document:", err);
          failedDocs.push(doc.filename);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/developer/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/developer/stats"] });
      if (failedDocs.length > 0) {
        toast({
          title: "Project created with warnings",
          description: `Submitted, but ${failedDocs.length} document(s) failed to attach: ${failedDocs.join(", ")}. Re-upload from the project detail page.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Project created",
          description: "Your project has been submitted successfully.",
        });
      }
      setLocation(`/developer/projects/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  function handleNext() {
    if (currentStep === 1) {
      step1Form.handleSubmit(() => setCurrentStep(2))();
    } else if (currentStep === 2) {
      step2Form.handleSubmit(() => setCurrentStep(3))();
    } else if (currentStep === 3) {
      step3Form.handleSubmit(() => setCurrentStep(4))();
    } else if (currentStep === 4) {
      setCurrentStep(5);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleAddDocument() {
    if (!docType || !docFilename.trim()) return;
    setPendingDocs([...pendingDocs, { type: docType, filename: docFilename.trim() }]);
    setDocType("");
    setDocFilename("");
  }

  function handleRemoveDocument(index: number) {
    setPendingDocs(pendingDocs.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    const step1 = step1Form.getValues();
    const step2 = step2Form.getValues();
    const step3 = step3Form.getValues();
    createProjectMutation.mutate({ step1, step2, step3 });
  }

  const formatLabel = (s: string) =>
    s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

  return (
    <DashboardLayout
      title="Tokenize Project"
      description="Create and tokenize a new renewable energy project offering"
      breadcrumbs={[
        { label: "Issuer", href: "/developer" },
        { label: "Tokenize Project" },
      ]}
    >
      <div className="max-w-3xl mx-auto">
        {!isVerified && (
          <div className="mb-6">
            <IdentityVerificationCard />
            <p className="text-sm text-amber-400 mt-2" data-testid="text-verify-to-submit">
              You can fill out the wizard, but KYC/AML verification is required before submitting the offering.
            </p>
          </div>
        )}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Step {currentStep} of {STEPS.length}</span>
            <span>{Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100)}% complete</span>
          </div>
          <Progress value={((currentStep - 1) / (STEPS.length - 1)) * 100} className="h-1.5" data-testid="wizard-progress-bar" />
        </div>
        <div className="flex items-center justify-center mb-8" data-testid="step-indicator">
          {STEPS.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-medium transition-colors",
                    currentStep === step.number
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep > step.number
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}
                  data-testid={`step-circle-${step.number}`}
                >
                  {currentStep > step.number ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1",
                    currentStep === step.number
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-2 mb-5",
                    currentStep > step.number
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Project Basics</CardTitle>
              <CardDescription>Enter the basic details of your project</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...step1Form}>
                <form className="space-y-6">
                  <FormField
                    control={step1Form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Sunfield Solar Farm"
                            data-testid="input-project-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={step1Form.control}
                      name="technology"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Technology</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-technology">
                                <SelectValue placeholder="Select technology" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SOLAR">Solar</SelectItem>
                              <SelectItem value="SOLAR_STORAGE">Solar + Storage</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step1Form.control}
                      name="stage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stage</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-stage">
                                <SelectValue placeholder="Select stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PRE_NTP">Pre-NTP</SelectItem>
                              <SelectItem value="NTP">NTP</SelectItem>
                              <SelectItem value="CONSTRUCTION">Construction</SelectItem>
                              <SelectItem value="COD">COD</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={step1Form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-state">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {US_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step1Form.control}
                      name="county"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>County</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Travis County"
                              data-testid="input-county"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={step1Form.control}
                    name="capacityMW"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity (MW)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 50"
                            data-testid="input-capacity-mw"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
              <CardDescription>Provide current development status details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...step2Form}>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={step2Form.control}
                      name="siteControlStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Site Control</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-site-control">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              <SelectItem value="LOI">LOI</SelectItem>
                              <SelectItem value="OPTION">Option</SelectItem>
                              <SelectItem value="LEASE">Lease</SelectItem>
                              <SelectItem value="OWNED">Owned</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step2Form.control}
                      name="interconnectionStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interconnection</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-interconnection">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="UNKNOWN">Unknown</SelectItem>
                              <SelectItem value="APPLIED">Applied</SelectItem>
                              <SelectItem value="STUDY">Study</SelectItem>
                              <SelectItem value="IA_EXECUTED">IA Executed</SelectItem>
                              <SelectItem value="READY_TO_BUILD">Ready to Build</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={step2Form.control}
                      name="permittingStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Permitting</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-permitting">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="UNKNOWN">Unknown</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="SUBMITTED">Submitted</SelectItem>
                              <SelectItem value="APPROVED">Approved</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step2Form.control}
                      name="offtakerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            Offtaker Type
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>C&amp;I: Commercial &amp; Industrial buyer. Community Solar: shared local program. Utility: large utility PPA. Merchant: sells at spot market rates (higher risk).</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-offtaker">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="C_AND_I">C&I</SelectItem>
                              <SelectItem value="COMMUNITY_SOLAR">Community Solar</SelectItem>
                              <SelectItem value="UTILITY">Utility</SelectItem>
                              <SelectItem value="MERCHANT">Merchant</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={step2Form.control}
                    name="feocAttested"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-feoc"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>FEOC Attestation</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            I attest that this project meets Foreign Entity of Concern (FEOC) requirements
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Financials</CardTitle>
              <CardDescription>Enter the capital stack and financial details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...step3Form}>
                <form className="space-y-6">
                  <FormField
                    control={step3Form.control}
                    name="totalCapex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total CapEx ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 50000000"
                            data-testid="input-total-capex"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={step3Form.control}
                      name="taxCreditType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            Tax Credit Type
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>ITC: one-time Investment Tax Credit on project cost. PTC: Production Tax Credit earned per kWh of electricity generated over 10 years.</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-tax-credit-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ITC">ITC</SelectItem>
                              <SelectItem value="PTC">PTC</SelectItem>
                              <SelectItem value="UNKNOWN">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step3Form.control}
                      name="taxCreditEstimated"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Credit Estimated ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 15000000"
                              data-testid="input-tax-credit-estimated"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={step3Form.control}
                    name="equityTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equity Target ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 10000000"
                            data-testid="input-equity-target"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step3Form.control}
                    name="taxCreditTransferabilityReady"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-transferability"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="flex items-center gap-1.5">
                            Tax Credit Transferability Ready
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Under the Inflation Reduction Act, projects may transfer (sell) their tax credits to third-party buyers. Check this if the project is structured to allow transferability.</p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            This project is ready for tax credit transferability
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Add supporting documents (optional). You can also add documents later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[160px]">
                    <Label htmlFor="doc-type">Document Type</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger data-testid="select-doc-type" id="doc-type">
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
                    <Label htmlFor="doc-filename">Filename</Label>
                    <Input
                      id="doc-filename"
                      placeholder="e.g., site-lease.pdf"
                      value={docFilename}
                      onChange={(e) => setDocFilename(e.target.value)}
                      data-testid="input-doc-filename"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddDocument}
                    disabled={!docType || !docFilename.trim()}
                    data-testid="button-add-document"
                  >
                    Add
                  </Button>
                </div>

                {pendingDocs.length > 0 && (
                  <div className="space-y-2">
                    {pendingDocs.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                        data-testid={`doc-item-${index}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.filename}</p>
                            <p className="text-xs text-muted-foreground">{formatLabel(doc.type)}</p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveDocument(index)}
                          data-testid={`button-remove-doc-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {pendingDocs.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No documents added yet</p>
                    <p className="text-sm text-muted-foreground mt-1">This step is optional</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Submit</CardTitle>
              <CardDescription>Review your project details before submitting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Basics
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <span className="font-medium" data-testid="review-name">{step1Form.getValues("name")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Technology:</span>{" "}
                      <span className="font-medium" data-testid="review-technology">{formatLabel(step1Form.getValues("technology"))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stage:</span>{" "}
                      <span className="font-medium" data-testid="review-stage">{formatLabel(step1Form.getValues("stage"))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>{" "}
                      <span className="font-medium" data-testid="review-location">
                        {step1Form.getValues("county")}, {step1Form.getValues("state")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Capacity:</span>{" "}
                      <span className="font-medium" data-testid="review-capacity">{step1Form.getValues("capacityMW")} MW</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Status
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Site Control:</span>{" "}
                      <span className="font-medium" data-testid="review-site-control">{formatLabel(step2Form.getValues("siteControlStatus"))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Interconnection:</span>{" "}
                      <span className="font-medium" data-testid="review-interconnection">{formatLabel(step2Form.getValues("interconnectionStatus"))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Permitting:</span>{" "}
                      <span className="font-medium" data-testid="review-permitting">{formatLabel(step2Form.getValues("permittingStatus"))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Offtaker:</span>{" "}
                      <span className="font-medium" data-testid="review-offtaker">{formatLabel(step2Form.getValues("offtakerType"))}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">FEOC Attested:</span>{" "}
                      <span className="font-medium" data-testid="review-feoc">{step2Form.getValues("feocAttested") ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Financials
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total CapEx:</span>{" "}
                      <span className="font-medium" data-testid="review-capex">
                        ${Number(step3Form.getValues("totalCapex")).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tax Credit Type:</span>{" "}
                      <span className="font-medium" data-testid="review-tax-credit-type">{step3Form.getValues("taxCreditType")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tax Credit Estimated:</span>{" "}
                      <span className="font-medium" data-testid="review-tax-credit-est">
                        ${Number(step3Form.getValues("taxCreditEstimated")).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Equity Target:</span>{" "}
                      <span className="font-medium" data-testid="review-equity-target">
                        ${Number(step3Form.getValues("equityTarget")).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Transferability Ready:</span>{" "}
                      <span className="font-medium" data-testid="review-transferability">
                        {step3Form.getValues("taxCreditTransferabilityReady") ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                {pendingDocs.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Documents ({pendingDocs.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingDocs.map((doc, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{doc.filename}</span>
                          <span className="text-muted-foreground">({formatLabel(doc.type)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? () => setLocation("/developer") : handleBack}
            data-testid="button-back"
          >
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          {currentStep < 5 ? (
            <Button onClick={handleNext} data-testid="button-next">
              {currentStep === 4 ? "Review" : "Next"}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createProjectMutation.isPending || !isVerified}
              data-testid="button-submit-project"
            >
              {createProjectMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isVerified ? "Submit Project" : "Verify Identity to Submit"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
