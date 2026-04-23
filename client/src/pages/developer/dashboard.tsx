import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { StatusBadge } from "@/components/status-badge";
import { IdentityVerificationCard } from "@/components/identity-verification-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  Send,
  CheckCircle,
  DollarSign,
  AlertTriangle,
  Plus,
  ArrowRight,
} from "lucide-react";
import { InstitutionalProjectMetrics } from "@/components/institutional-project-metrics";

interface DeveloperStats {
  totalProjects: number;
  submitted: number;
  approved: number;
  totalInterestAmount: number;
  totalInterests: number;
  missingItems: number;
}

interface DeveloperProject {
  id: string;
  name: string;
  technology: string;
  state: string;
  county: string;
  capacityMW: string | null;
  status: string;
  financialApyPct?: string | null;
  validationConfidence?: string | null;
  readinessScore?: {
    score: number;
    rating: string;
  };
  missingCount: number;
  interestCount: number;
}

export default function DeveloperDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DeveloperStats>({
    queryKey: ["/api/developer/stats"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<DeveloperProject[]>({
    queryKey: ["/api/developer/projects"],
  });

  return (
    <DashboardLayout
      title="Issuer Dashboard"
      description="Manage your renewable energy project securities"
      actions={
        <Link href="/developer/projects/new">
          <Button className="gap-2" data-testid="button-new-project">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      }
    >
      <Card className="mb-6 border-yellow-500/30 bg-yellow-500/10">
        <CardContent className="p-4 flex items-center gap-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
          <p className="text-sm text-yellow-500" data-testid="text-disclaimer-banner">
            EcoXchange is a regulated digital securities platform. All offerings must pass compliance checks and KYC/AML verification before listing.
          </p>
        </CardContent>
      </Card>

      <div className="mb-6">
        <IdentityVerificationCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statsLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
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
              title="Submitted"
              value={stats?.submitted ?? 0}
              icon={Send}
            />
            <StatsCard
              title="Approved"
              value={stats?.approved ?? 0}
              icon={CheckCircle}
            />
            <StatsCard
              title="Total Commitments"
              value={`$${(stats?.totalInterestAmount ?? 0).toLocaleString()}`}
              description={`${stats?.totalInterests ?? 0} investment commitments`}
              icon={DollarSign}
            />
            <StatsCard
              title="Missing Items"
              value={stats?.missingItems ?? 0}
              icon={AlertTriangle}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">Recent Projects</CardTitle>
          <Link href="/developer/projects/new">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-all-projects">
              New Project
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !projects?.length ? (
            <div className="text-center py-8">
              <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Link href="/developer/projects/new">
                <Button size="sm" className="gap-2" data-testid="button-create-first-project">
                  <Plus className="h-4 w-4" />
                  Create Your First Project
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/developer/projects/${project.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate cursor-pointer"
                  data-testid={`card-project-${project.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium" data-testid={`text-project-name-${project.id}`}>
                        {project.name}
                      </span>
                      <StatusBadge status={project.status} type="project" />
                      {project.readinessScore && (
                        <StatusBadge status={project.readinessScore.rating} type="readiness" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>{project.technology.replace("_", " ")}</span>
                      <span>{project.state}, {project.county}</span>
                      {project.capacityMW && <span>{project.capacityMW} MW</span>}
                    </div>
                    <InstitutionalProjectMetrics
                      variant="compact"
                      className="mt-2"
                      testIdPrefix={project.id}
                      validationConfidence={project.validationConfidence}
                      financialApyPct={project.financialApyPct}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0 ml-4">
                    {project.missingCount > 0 && (
                      <span className="flex items-center gap-1 text-yellow-500" data-testid={`text-missing-count-${project.id}`}>
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {project.missingCount} missing
                      </span>
                    )}
                    {project.interestCount > 0 && (
                      <span className="flex items-center gap-1" data-testid={`text-interest-count-${project.id}`}>
                        <DollarSign className="h-3.5 w-3.5" />
                        {project.interestCount} interest{project.interestCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
