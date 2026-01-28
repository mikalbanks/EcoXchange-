import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  Briefcase, 
  Coins, 
  TrendingUp,
  Store,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface InvestorStats {
  balance: number;
  totalInvested: number;
  totalTokens: number;
  totalDistributions: number;
  kycStatus: string;
  accredited: boolean;
}

interface RecentCommitment {
  id: string;
  offeringName: string;
  amount: string;
  status: string;
}

export default function InvestorDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<InvestorStats>({
    queryKey: ["/api/investor/stats"],
  });

  const { data: recentCommitments } = useQuery<RecentCommitment[]>({
    queryKey: ["/api/investor/commitments", "recent"],
  });

  const demoMode = true; // DEMO_STABLECOIN=true

  return (
    <DashboardLayout
      title="Investor Dashboard"
      description="Manage your investments and portfolio"
      actions={
        <Link href="/investor/marketplace">
          <Button className="gap-2" data-testid="button-browse-marketplace">
            <Store className="h-4 w-4" />
            Browse Marketplace
          </Button>
        </Link>
      }
    >
      {/* KYC Status Banner */}
      {stats && (stats.kycStatus !== "APPROVED" || !stats.accredited) && (
        <Card className="mb-6 border-yellow-500/30 bg-yellow-500/10">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <div className="flex-1">
              <p className="font-medium text-yellow-500">Complete Verification Required</p>
              <p className="text-sm text-muted-foreground">
                {stats.kycStatus !== "APPROVED" 
                  ? "Complete KYC verification to invest"
                  : "Accreditation verification pending"
                }
              </p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={stats.kycStatus} type="kyc" />
              {stats.kycStatus === "APPROVED" && !stats.accredited && (
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  Not Accredited
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            {demoMode && (
              <StatsCard
                title="USDC Balance (Demo)"
                value={`$${(stats?.balance ?? 0).toLocaleString()}`}
                description="Available for investment"
                icon={Wallet}
              />
            )}
            <StatsCard
              title="Total Invested"
              value={`$${(stats?.totalInvested ?? 0).toLocaleString()}`}
              icon={Briefcase}
            />
            <StatsCard
              title="Token Holdings"
              value={stats?.totalTokens ?? 0}
              description="Across all offerings"
              icon={Coins}
            />
            <StatsCard
              title="Distributions Received"
              value={`$${(stats?.totalDistributions ?? 0).toLocaleString()}`}
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Recent Investments</CardTitle>
            <Link href="/investor/portfolio">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!recentCommitments?.length ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-4">No investments yet</p>
                <Link href="/investor/marketplace">
                  <Button size="sm" className="gap-2">
                    <Store className="h-4 w-4" />
                    Browse Marketplace
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCommitments.map((commitment) => (
                  <div 
                    key={commitment.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium">{commitment.offeringName}</p>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/investor/marketplace" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Browse Offerings</p>
                  <p className="text-sm text-muted-foreground">Explore open investment opportunities</p>
                </div>
              </div>
            </Link>
            
            <Link href="/investor/portfolio" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">View Portfolio</p>
                  <p className="text-sm text-muted-foreground">Track your investments and tokens</p>
                </div>
              </div>
            </Link>

            <Link href="/investor/wallet" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Wallet & Transactions</p>
                  <p className="text-sm text-muted-foreground">View ledger activity (Demo Mode)</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
