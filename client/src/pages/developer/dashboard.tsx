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
  Zap,
  Banknote,
} from "lucide-react";

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
  readinessScore?: { score: number; rating: string };
  missingCount: number;
  interestCount: number;
}

export default function DeveloperDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DeveloperStats>({ queryKey: ["/api/developer/stats"] });
  const { data: projects, isLoading: projectsLoading } = useQuery<DeveloperProject[]>({ queryKey: ["/api/developer/projects"] });

  return (
    <DashboardLayout
      title="Issuer Dashboard"
      description="Manage renewable-energy projects and financing analysis"
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/developer/finance"><Button variant="outline" className="gap-2" data-testid="button-bankability-cta"><Banknote className="h-4 w-4" />Bankability & Sponsor Equity</Button></Link>
          <Link href="/developer/onboard"><Button variant="outline" className="gap-2" data-testid="button-run-backtest-cta"><Zap className="h-4 w-4" />Run a Backtest</Button></Link>
          <Link href="/developer/projects/new"><Button className="gap-2" data-testid="button-new-project"><Plus className="h-4 w-4" />New Project</Button></Link>
        </div>
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

      <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><Banknote className="h-4 w-4 text-primary" />Estimate bank debt capacity and sponsor equity</h3>
            <p className="text-sm text-muted-foreground">Run lender-style project-finance analysis against an existing project, then change PPA, capex, debt, and tax-credit assumptions in a custom scenario.</p>
            <p className="mt-1 text-xs text-muted-foreground">Indicative only — not a financing commitment, credit decision, lender approval, tax opinion, or legal advice.</p>
          </div>
          <Link href="/developer/finance"><Button className="gap-2 shrink-0" data-testid="button-finance-workspace-cta">Analyze Financing<ArrowRight className="h-4 w-4" /></Button></Link>
        </CardContent>
      </Card>

      <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4 text-primary" />Run a production backtest</h3>
            <p className="text-sm text-muted-foreground">Enter your project's location and specs and watch a 12-month backtest run against real NASA satellite data in ~60 seconds.</p>
          </div>
          <Link href="/developer/onboard"><Button variant="outline" className="gap-2 shrink-0" data-testid="button-onboard-cta">Onboard a Project<ArrowRight className="h-4 w-4" /></Button></Link>
        </CardContent>
      </Card>

      <div className="mb-6"><IdentityVerificationCard /></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statsLoading ? [...Array(5)].map((_, i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>) : <>
          <StatsCard title="Total Projects" value={stats?.totalProjects ?? 0} icon={FolderKanban} />
          <StatsCard title="Submitted" value={stats?.submitted ?? 0} icon={Send} />
          <StatsCard title="Approved" value={stats?.approved ?? 0} icon={CheckCircle} />
          <StatsCard title="Total Commitments" value={`$${(stats?.totalInterestAmount ?? 0).toLocaleString()}`} description={`${stats?.totalInterests ?? 0} investment commitments`} icon={DollarSign} />
          <StatsCard title="Missing Items" value={stats?.missingItems ?? 0} icon={AlertTriangle} />
        </>}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2"><CardTitle className="text-lg">Recent Projects</CardTitle><Link href="/developer/projects/new"><Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-all-projects">New Project<ArrowRight className="h-4 w-4" /></Button></Link></CardHeader>
        <CardContent>
          {projectsLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div> : !projects?.length ? (
            <div className="text-center py-8"><FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" /><p className="text-muted-foreground mb-4">No projects yet</p><Link href="/developer/onboard"><Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Onboard Your First Project</Button></Link></div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/developer/projects/${project.id}`} className="flex-1 min-w-0 hover:text-primary" data-testid={`card-project-${project.id}`}>
                    <div className="flex flex-wrap items-center gap-2 mb-1"><span className="font-medium" data-testid={`text-project-name-${project.id}`}>{project.name}</span><StatusBadge status={project.status} type="project" />{project.readinessScore && <StatusBadge status={project.readinessScore.rating} type="readiness" />}</div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground"><span>{project.technology.replace("_", " ")}</span><span>{project.state}, {project.county}</span>{project.capacityMW && <span>{project.capacityMW} MW</span>}</div>
                  </Link>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {project.missingCount > 0 && <span className="flex items-center gap-1 text-xs text-yellow-500" data-testid={`text-missing-count-${project.id}`}><AlertTriangle className="h-3.5 w-3.5" />{project.missingCount} missing</span>}
                    {project.interestCount > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-interest-count-${project.id}`}><DollarSign className="h-3.5 w-3.5" />{project.interestCount} interest{project.interestCount !== 1 ? "s" : ""}</span>}
                    <Link href={`/developer/projects/${project.id}/finance`}><Button size="sm" variant="outline" className="gap-2" data-testid={`button-finance-${project.id}`}><Banknote className="h-4 w-4" />Analyze Financing</Button></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
