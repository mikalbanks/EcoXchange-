import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { 
  FolderKanban, 
  FileStack, 
  DollarSign, 
  Users, 
  Plus, 
  ArrowRight,
  TrendingUp
} from "lucide-react";

interface IssuerStats {
  totalProjects: number;
  totalOfferings: number;
  totalRaised: number;
  totalInvestors: number;
}

interface RecentOffering {
  id: string;
  name: string;
  status: string;
  targetRaise: string;
  projectName: string;
}

export default function IssuerDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<IssuerStats>({
    queryKey: ["/api/issuer/stats"],
  });

  const { data: recentOfferings, isLoading: offeringsLoading } = useQuery<RecentOffering[]>({
    queryKey: ["/api/issuer/offerings", "recent"],
  });

  return (
    <DashboardLayout
      title="Issuer Dashboard"
      description="Manage your projects and offerings"
      actions={
        <Link href="/issuer/projects/new">
          <Button className="gap-2" data-testid="button-new-project">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      }
    >
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
            <StatsCard
              title="Total Projects"
              value={stats?.totalProjects ?? 0}
              icon={FolderKanban}
            />
            <StatsCard
              title="Active Offerings"
              value={stats?.totalOfferings ?? 0}
              icon={FileStack}
            />
            <StatsCard
              title="Total Raised"
              value={`$${((stats?.totalRaised ?? 0) / 1000000).toFixed(1)}M`}
              icon={DollarSign}
            />
            <StatsCard
              title="Total Investors"
              value={stats?.totalInvestors ?? 0}
              icon={Users}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Recent Offerings</CardTitle>
            <Link href="/issuer/offerings">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {offeringsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : !recentOfferings?.length ? (
              <EmptyState
                icon={FileStack}
                title="No offerings yet"
                description="Create your first project and offering to get started"
                action={
                  <Link href="/issuer/projects/new">
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Project
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                {recentOfferings.map((offering) => (
                  <Link 
                    key={offering.id} 
                    href={`/issuer/offerings/${offering.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover-elevate cursor-pointer"
                  >
                    <div>
                      <p className="font-medium" data-testid={`text-offering-name-${offering.id}`}>
                        {offering.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {offering.projectName} • Target: ${Number(offering.targetRaise).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={offering.status} type="offering" />
                  </Link>
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
            <Link href="/issuer/projects/new" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Create New Project</p>
                  <p className="text-sm text-muted-foreground">Add a new renewable energy project</p>
                </div>
              </div>
            </Link>
            
            <Link href="/issuer/offerings" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <FileStack className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Manage Offerings</p>
                  <p className="text-sm text-muted-foreground">View and manage your securities offerings</p>
                </div>
              </div>
            </Link>

            <Link href="/issuer/projects" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">View All Projects</p>
                  <p className="text-sm text-muted-foreground">See all your registered projects</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
