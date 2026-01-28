import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  FileStack, 
  DollarSign, 
  ShieldCheck,
  ArrowRight
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalOfferings: number;
  totalRaised: number;
  pendingKyc: number;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  return (
    <DashboardLayout
      title="Admin Dashboard"
      description="Platform overview and management"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
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
            <StatsCard
              title="Total Users"
              value={stats?.totalUsers ?? 0}
              icon={Users}
            />
            <StatsCard
              title="Total Offerings"
              value={stats?.totalOfferings ?? 0}
              icon={FileStack}
            />
            <StatsCard
              title="Total Raised"
              value={`$${((stats?.totalRaised ?? 0) / 1000000).toFixed(1)}M`}
              icon={DollarSign}
            />
            <StatsCard
              title="Pending KYC"
              value={stats?.pendingKyc ?? 0}
              description="Awaiting review"
              icon={ShieldCheck}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/users" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover-elevate cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Manage Users</p>
                    <p className="text-sm text-muted-foreground">KYC approvals and accreditation</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
            
            <Link href="/admin/offerings" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover-elevate cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <FileStack className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">View Offerings</p>
                    <p className="text-sm text-muted-foreground">All platform offerings</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Demo Mode</span>
                <span className="font-medium text-primary">USDC Simulation Active</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Compliance</span>
                <span className="font-medium">Reg D (Stubbed)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Token Standard</span>
                <span className="font-medium">ERC-3643 (Simulated)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
