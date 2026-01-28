import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign,
  Calendar,
  TrendingUp,
  Sun,
  Wind,
  Zap,
  HelpCircle,
  MapPin,
  Gauge,
  Loader2,
  AlertCircle,
  CheckCircle,
  Wallet
} from "lucide-react";
import { investmentFormSchema, type Offering } from "@shared/schema";

interface OfferingDetail extends Offering {
  projectName: string;
  assetType: string;
  location: string;
  capacityMW: string | null;
}

interface InvestorStatus {
  kycStatus: string;
  accredited: boolean;
  balance: number;
}

type InvestmentFormValues = z.infer<typeof investmentFormSchema>;

const assetTypeIcons: Record<string, typeof Sun> = {
  SOLAR: Sun,
  WIND: Wind,
  HYDROGEN: Zap,
  OTHER: HelpCircle,
};

export default function InvestorOfferingDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: offering, isLoading } = useQuery<OfferingDetail>({
    queryKey: ["/api/offerings", id],
  });

  const { data: investorStatus } = useQuery<InvestorStatus>({
    queryKey: ["/api/investor/status"],
  });

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: {
      amount: "",
    },
  });

  const investMutation = useMutation({
    mutationFn: async (values: InvestmentFormValues) => {
      const res = await apiRequest("POST", `/api/investor/offerings/${id}/invest`, values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investor/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investor/commitments"] });
      toast({
        title: "Investment submitted!",
        description: "Your commitment has been recorded.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit investment",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Investor", href: "/investor" },
          { label: "Marketplace", href: "/investor/marketplace" },
          { label: "Loading..." }
        ]}
      >
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!offering) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Investor", href: "/investor" },
          { label: "Marketplace", href: "/investor/marketplace" },
          { label: "Not Found" }
        ]}
      >
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Offering not found</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const Icon = assetTypeIcons[offering.assetType] || HelpCircle;
  const canInvest = investorStatus?.kycStatus === "APPROVED" && investorStatus?.accredited && offering.status === "OPEN";
  const demoMode = true;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Investor", href: "/investor" },
        { label: "Marketplace", href: "/investor/marketplace" },
        { label: offering.name }
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold" data-testid="text-offering-name">
                      {offering.name}
                    </h1>
                    <StatusBadge status={offering.status} type="offering" />
                  </div>
                  <p className="text-muted-foreground">{offering.projectName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Target Raise</span>
                  </div>
                  <p className="font-semibold">${Number(offering.targetRaise).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Min Investment</span>
                  </div>
                  <p className="font-semibold">${Number(offering.minInvestment).toLocaleString()}</p>
                </div>
                {offering.expectedIrr && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs">Expected IRR</span>
                    </div>
                    <p className="font-semibold text-primary">{offering.expectedIrr}%</p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Distribution</span>
                  </div>
                  <p className="font-semibold capitalize">{offering.distributionFrequency.toLowerCase()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Project Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{offering.location}</span>
                  </div>
                  {offering.capacityMW && (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span>{offering.capacityMW} MW capacity</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">{offering.securityType.toLowerCase()}</Badge>
                <Badge variant="outline" className="capitalize">{offering.assetType.toLowerCase()}</Badge>
                <Badge variant="outline">{offering.jurisdiction}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Investment Status */}
          {investorStatus && (investorStatus.kycStatus !== "APPROVED" || !investorStatus.accredited) && (
            <Card className="border-yellow-500/30 bg-yellow-500/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-500 mb-1">Verification Required</p>
                    <p className="text-sm text-muted-foreground">
                      {investorStatus.kycStatus !== "APPROVED" 
                        ? "Complete KYC verification to invest"
                        : "Accreditation verification required"
                      }
                    </p>
                    <div className="flex gap-2 mt-2">
                      <StatusBadge status={investorStatus.kycStatus} type="kyc" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invest</CardTitle>
              <CardDescription>
                Submit your investment commitment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {demoMode && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Available Balance</span>
                  </div>
                  <span className="font-semibold text-primary">
                    ${(investorStatus?.balance ?? 0).toLocaleString()} USDC
                  </span>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => investMutation.mutate(v))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={`Min: $${Number(offering.minInvestment).toLocaleString()}`}
                            data-testid="input-investment-amount"
                            disabled={!canInvest}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!canInvest || investMutation.isPending}
                    data-testid="button-invest"
                  >
                    {investMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {canInvest ? "Submit Investment" : "Verification Required"}
                  </Button>
                </form>
              </Form>

              {canInvest && (
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>You are verified to invest</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
