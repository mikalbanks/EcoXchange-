import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  Send,
  CheckCircle,
  XCircle,
  BarChart3,
  DollarSign,
  Clock,
} from "lucide-react";

interface AdminStats {
  totalProjects: number;
  submitted: number;
  inReview: number;
  approved: number;
  rejected: number;
  avgReadinessScore: number;
  totalIntentAmount: number;
  totalInterests: number;
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  if (error) {
    return (
      <DashboardLayout
        title="Admin Dashboard"
        description="Platform overview and project review management"
      >
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive" data-testid="text-error">
              Failed to load dashboard stats. Please try again later.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Admin Dashboard"
      description="Platform overview and project review management"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              title="Total Projects"
              value={stats?.totalProjects ?? 0}
              icon={FolderKanban}
              data-testid="stat-total-projects"
            />
            <StatsCard
              title="Submitted"
              value={stats?.submitted ?? 0}
              description="Pending review"
              icon={Send}
            />
            <StatsCard
              title="In Review"
              value={stats?.inReview ?? 0}
              icon={Clock}
            />
            <StatsCard
              title="Approved"
              value={stats?.approved ?? 0}
              icon={CheckCircle}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            {[...Array(3)].map((_, i) => (
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
              title="Rejected"
              value={stats?.rejected ?? 0}
              icon={XCircle}
            />
            <StatsCard
              title="Avg Readiness Score"
              value={stats?.avgReadinessScore != null ? `${Math.round(stats.avgReadinessScore)}` : "N/A"}
              description="Out of 100"
              icon={BarChart3}
            />
            <StatsCard
              title="Total Interest"
              value={`$${(stats?.totalIntentAmount ?? 0).toLocaleString()}`}
              description={`${stats?.totalInterests ?? 0} expressions of interest`}
              icon={DollarSign}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
