import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign,
  Calendar,
  TrendingUp,
  Users,
  Coins,
  FileStack,
  CheckCircle,
  XCircle,
  Loader2,
  Banknote
} from "lucide-react";
import type { Offering, Commitment, Distribution, Tokenization } from "@shared/schema";

interface OfferingDetail extends Offering {
  projectName: string;
}

interface CommitmentWithInvestor extends Commitment {
  investorEmail: string;
}

export default function OfferingDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: offering, isLoading } = useQuery<OfferingDetail>({
    queryKey: ["/api/issuer/offerings", id],
  });

  const { data: commitments } = useQuery<CommitmentWithInvestor[]>({
    queryKey: ["/api/issuer/offerings", id, "commitments"],
    enabled: !!id,
  });

  const { data: tokenization } = useQuery<Tokenization | null>({
    queryKey: ["/api/issuer/offerings", id, "tokenization"],
    enabled: !!id,
  });

  const { data: distributions } = useQuery<Distribution[]>({
    queryKey: ["/api/issuer/offerings", id, "distributions"],
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/issuer/offerings/${id}/publish`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issuer/offerings", id] });
      toast({ title: "Offering published", description: "The offering is now open for investment." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/issuer/offerings/${id}/close`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issuer/offerings", id] });
      toast({ title: "Offering closed", description: "The offering is now closed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const mintMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/issuer/offerings/${id}/mint`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issuer/offerings", id, "tokenization"] });
      toast({ title: "Tokens minted", description: "Digital securities have been allocated to investors." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Issuer", href: "/issuer" },
          { label: "Offerings", href: "/issuer/offerings" },
          { label: "Loading..." }
        ]}
      >
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!offering) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Issuer", href: "/issuer" },
          { label: "Offerings", href: "/issuer/offerings" },
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

  const confirmedCommitments = commitments?.filter(c => c.status === "CONFIRMED") || [];
  const totalCommitted = confirmedCommitments.reduce((sum, c) => sum + Number(c.amount), 0);
  const progressPercent = Math.min((totalCommitted / Number(offering.targetRaise)) * 100, 100);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Issuer", href: "/issuer" },
        { label: "Offerings", href: "/issuer/offerings" },
        { label: offering.name }
      ]}
      actions={
        <div className="flex gap-2">
          {offering.status === "DRAFT" && (
            <Button 
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              data-testid="button-publish"
            >
              {publishMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
            </Button>
          )}
          {offering.status === "OPEN" && (
            <Button 
              variant="outline"
              onClick={() => closeMutation.mutate()}
              disabled={closeMutation.isPending}
              data-testid="button-close"
            >
              {closeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Close Offering
            </Button>
          )}
          {offering.status === "CLOSED" && !tokenization && (
            <Button 
              onClick={() => mintMutation.mutate()}
              disabled={mintMutation.isPending}
              data-testid="button-mint"
            >
              {mintMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Coins className="mr-2 h-4 w-4" />
              Mint Tokens
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold" data-testid="text-offering-name">
                    {offering.name}
                  </h1>
                  <StatusBadge status={offering.status} type="offering" />
                  <Badge variant="outline" className="capitalize">
                    {offering.securityType.toLowerCase()}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{offering.projectName}</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">${totalCommitted.toLocaleString()} / ${Number(offering.targetRaise).toLocaleString()}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{progressPercent.toFixed(1)}% funded</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          </CardContent>
        </Card>

        <Tabs defaultValue="investors" className="space-y-4">
          <TabsList>
            <TabsTrigger value="investors" className="gap-2">
              <Users className="h-4 w-4" />
              Investors
            </TabsTrigger>
            <TabsTrigger value="tokenization" className="gap-2">
              <Coins className="h-4 w-4" />
              Tokenization
            </TabsTrigger>
            <TabsTrigger value="distributions" className="gap-2">
              <Banknote className="h-4 w-4" />
              Distributions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="investors">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Investor Commitments</CardTitle>
                <CardDescription>
                  {confirmedCommitments.length} confirmed commitment{confirmedCommitments.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!commitments?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No commitments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commitments.map((commitment) => (
                      <div 
                        key={commitment.id} 
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                      >
                        <div>
                          <p className="font-medium">{commitment.investorEmail}</p>
                          <p className="text-sm text-muted-foreground">
                            ${Number(commitment.amount).toLocaleString()}
                          </p>
                        </div>
                        <StatusBadge status={commitment.status} type="commitment" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tokenization">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Token Information</CardTitle>
                <CardDescription>
                  Simulated ERC-3643 compliant digital securities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!tokenization ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="mb-2">Tokens not minted yet</p>
                    {offering.status === "CLOSED" && (
                      <Button 
                        onClick={() => mintMutation.mutate()}
                        disabled={mintMutation.isPending}
                        className="mt-2"
                      >
                        {mintMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Mint Tokens
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Token Name</p>
                        <p className="font-medium">{tokenization.tokenName}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Token Symbol</p>
                        <p className="font-medium">{tokenization.tokenSymbol}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Standard</p>
                        <p className="font-medium">{tokenization.tokenStandard}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Contract (Simulated)</p>
                        <p className="font-mono text-xs truncate">{tokenization.tokenContractAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-emerald-500">
                      <CheckCircle className="h-4 w-4" />
                      <span>Tokens minted and allocated to confirmed investors</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distributions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribution History</CardTitle>
                <CardDescription>
                  Quarterly distributions to token holders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!distributions?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Banknote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No distributions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {distributions.map((dist) => (
                      <div 
                        key={dist.id} 
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                      >
                        <div>
                          <p className="font-medium">${Number(dist.totalAmount).toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(dist.periodStart).toLocaleDateString()} - {new Date(dist.periodEnd).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={dist.status} type="distribution" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
