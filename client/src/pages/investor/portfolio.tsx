import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  Coins,
  DollarSign,
  Banknote
} from "lucide-react";
import type { Commitment, TokenAllocation, DistributionPayout } from "@shared/schema";

interface CommitmentWithOffering extends Commitment {
  offeringName: string;
  projectName: string;
}

interface TokenWithOffering extends TokenAllocation {
  tokenSymbol: string;
  tokenName: string;
  offeringName: string;
}

interface PayoutWithDistribution extends DistributionPayout {
  offeringName: string;
  periodStart: string;
  periodEnd: string;
}

export default function InvestorPortfolio() {
  const { data: commitments, isLoading: commitmentsLoading } = useQuery<CommitmentWithOffering[]>({
    queryKey: ["/api/investor/commitments"],
  });

  const { data: tokens, isLoading: tokensLoading } = useQuery<TokenWithOffering[]>({
    queryKey: ["/api/investor/tokens"],
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery<PayoutWithDistribution[]>({
    queryKey: ["/api/investor/payouts"],
  });

  return (
    <DashboardLayout
      title="Portfolio"
      description="Your investments, tokens, and distributions"
      breadcrumbs={[
        { label: "Investor", href: "/investor" },
        { label: "Portfolio" }
      ]}
    >
      <Tabs defaultValue="commitments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="commitments" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Investments
          </TabsTrigger>
          <TabsTrigger value="tokens" className="gap-2">
            <Coins className="h-4 w-4" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="distributions" className="gap-2">
            <Banknote className="h-4 w-4" />
            Distributions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commitments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Investment Commitments</CardTitle>
              <CardDescription>
                Your investment history across all offerings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commitmentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex justify-between p-4 border rounded-lg">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : !commitments?.length ? (
                <EmptyState
                  icon={Briefcase}
                  title="No investments yet"
                  description="Your investment commitments will appear here"
                />
              ) : (
                <div className="space-y-3">
                  {commitments.map((commitment) => (
                    <div 
                      key={commitment.id} 
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div>
                        <p className="font-medium">{commitment.offeringName}</p>
                        <p className="text-sm text-muted-foreground">{commitment.projectName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {Number(commitment.amount).toLocaleString()}
                        </p>
                        <StatusBadge status={commitment.status} type="commitment" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Token Holdings</CardTitle>
              <CardDescription>
                Digital securities allocated to your wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tokensLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex justify-between p-4 border rounded-lg">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : !tokens?.length ? (
                <EmptyState
                  icon={Coins}
                  title="No tokens yet"
                  description="Tokens will be allocated when offerings are closed and minted"
                />
              ) : (
                <div className="space-y-3">
                  {tokens.map((token) => (
                    <div 
                      key={token.id} 
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                          <Coins className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{token.tokenName}</p>
                          <p className="text-sm text-muted-foreground">{token.offeringName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{Number(token.tokens).toLocaleString()}</p>
                        <Badge variant="outline">{token.tokenSymbol}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribution Payouts</CardTitle>
              <CardDescription>
                Quarterly distributions from your investments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex justify-between p-4 border rounded-lg">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : !payouts?.length ? (
                <EmptyState
                  icon={Banknote}
                  title="No distributions yet"
                  description="Distribution payouts will appear here"
                />
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div 
                      key={payout.id} 
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div>
                        <p className="font-medium">{payout.offeringName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payout.periodStart).toLocaleDateString()} - {new Date(payout.periodEnd).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {Number(payout.amount).toLocaleString()}
                        </p>
                        <StatusBadge status={payout.status} type="distribution" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
