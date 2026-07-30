import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Activity,
  ArrowRight,
  Banknote,
  BarChart3,
  CheckCircle,
  ClipboardCheck,
  DollarSign,
  FolderKanban,
  Inbox,
  RefreshCw,
  Users,
  XCircle,
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

interface AdminProject {
  id: string;
  name: string;
  technology: string;
  state: string | null;
  capacityMW: string | null;
  status: string;
  updatedAt: string | null;
  readinessScore: { score: number; rating: string } | null;
  developerName: string;
  developerOrg: string;
}

interface AdminInterest {
  id: string;
  projectId: string;
  projectName: string;
  investorName: string;
  investorOrg: string;
  amountIntent: string | null;
  structurePreference: string;
  timeline: string;
  status: string;
  createdAt: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  role: string;
  name: string;
  orgName: string | null;
  personaStatus: string;
}

const REVIEWABLE_STATUSES = ["SUBMITTED", "IN_REVIEW"];

const currency = (value: number) =>
  `$${Math.round(value).toLocaleString("en-US")}`;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Shared shell so a failure in one panel never blanks the whole dashboard. */
function Panel({
  title,
  icon: Icon,
  action,
  isLoading,
  error,
  isEmpty,
  emptyState,
  children,
  testId,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  isLoading: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive" data-testid={`${testId}-error`}>
            Couldn't load this section. Retry from the sidebar or reload the page.
          </p>
        ) : isEmpty ? (
          emptyState
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();

  const statsQuery = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });
  const projectsQuery = useQuery<AdminProject[]>({ queryKey: ["/api/admin/projects"] });
  const interestsQuery = useQuery<AdminInterest[]>({ queryKey: ["/api/admin/interests"] });
  const usersQuery = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"] });

  const refreshMarketplace = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/marketplace/refresh"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Marketplace refreshed", description: "Listings have been re-synced." });
    },
    onError: (error: any) => {
      toast({
        title: "Refresh failed",
        description: error?.message ?? "Could not refresh the marketplace.",
        variant: "destructive",
      });
    },
  });

  const stats = statsQuery.data;
  const awaitingReview = (stats?.submitted ?? 0) + (stats?.inReview ?? 0);

  // Longest-waiting first — that is the order a reviewer should work through.
  const reviewQueue = (projectsQuery.data ?? [])
    .filter((p) => REVIEWABLE_STATUSES.includes(p.status))
    .sort((a, b) => new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime());

  const interests = interestsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});
  const unverified = users.filter(
    (u) => u.role === "INVESTOR" && u.personaStatus !== "completed"
  ).length;

  return (
    <DashboardLayout
      title="Platform Console"
      description="Digital securities oversight — review queue, commitments and accounts"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => refreshMarketplace.mutate()}
            disabled={refreshMarketplace.isPending}
            data-testid="button-refresh-marketplace"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshMarketplace.isPending ? "animate-spin" : ""}`}
            />
            Refresh Marketplace
          </Button>
          <Link href="/admin/projects">
            <Button className="gap-2" data-testid="button-goto-review-queue">
              <ClipboardCheck className="h-4 w-4" />
              Review Queue
            </Button>
          </Link>
        </div>
      }
    >
      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {statsQuery.isLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatsCard
              title="Total Projects"
              value={stats?.totalProjects ?? 0}
              description="Across all stages"
              icon={FolderKanban}
            />
            <StatsCard
              title="Awaiting Review"
              value={awaitingReview}
              description={`${stats?.submitted ?? 0} submitted · ${stats?.inReview ?? 0} in review`}
              icon={Inbox}
            />
            <StatsCard
              title="Approved"
              value={stats?.approved ?? 0}
              description={`${stats?.rejected ?? 0} rejected`}
              icon={CheckCircle}
            />
            <StatsCard
              title="Total Commitments"
              value={currency(stats?.totalIntentAmount ?? 0)}
              description={`${stats?.totalInterests ?? 0} investor commitments`}
              icon={DollarSign}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {statsQuery.isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatsCard
              title="Avg Readiness Score"
              value={stats?.avgReadinessScore != null ? Math.round(stats.avgReadinessScore) : "N/A"}
              description="Out of 100"
              icon={BarChart3}
            />
            <StatsCard
              title="Rejected"
              value={stats?.rejected ?? 0}
              description="Did not pass review"
              icon={XCircle}
            />
            <StatsCard
              title="Accounts"
              value={users.length}
              description={
                usersQuery.isLoading
                  ? "Loading…"
                  : `${roleCounts.DEVELOPER ?? 0} issuers · ${roleCounts.INVESTOR ?? 0} investors`
              }
              icon={Users}
            />
          </>
        )}
      </div>

      {/* ── Review queue ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Panel
          testId="panel-review-queue"
          title={`Review Queue${reviewQueue.length ? ` (${reviewQueue.length})` : ""}`}
          icon={ClipboardCheck}
          isLoading={projectsQuery.isLoading}
          error={projectsQuery.error}
          isEmpty={reviewQueue.length === 0}
          action={
            <Link href="/admin/projects">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-all-projects">
                All projects
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
          emptyState={
            <EmptyState
              icon={CheckCircle}
              title="Nothing waiting on review"
              description="Every submitted project has been actioned. New submissions appear here."
            />
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Readiness</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewQueue.map((project) => (
                  <TableRow key={project.id} data-testid={`row-review-${project.id}`}>
                    <TableCell>
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {project.technology}
                        {project.state ? ` · ${project.state}` : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{project.developerName}</span>
                      {project.developerOrg && (
                        <p className="text-xs text-muted-foreground">{project.developerOrg}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {project.capacityMW ? `${Number(project.capacityMW).toFixed(1)} MW` : "—"}
                    </TableCell>
                    <TableCell>
                      {project.readinessScore ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {project.readinessScore.score}
                          </span>
                          <StatusBadge status={project.readinessScore.rating} type="readiness" />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not scored</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} type="project" />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(project.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/projects/${project.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-review-${project.id}`}
                        >
                          Review
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>

      {/* ── Commitments + accounts ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Panel
          testId="panel-commitments"
          title="Investor Commitments"
          icon={Banknote}
          isLoading={interestsQuery.isLoading}
          error={interestsQuery.error}
          isEmpty={interests.length === 0}
          action={
            <Link href="/admin/distributions">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-distributions">
                Distributions
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
          emptyState={
            <EmptyState
              icon={Banknote}
              title="No commitments yet"
              description="Investor commitments against listed projects will appear here."
            />
          }
        >
          <div className="space-y-2">
            {interests.slice(0, 6).map((interest) => (
              <div
                key={interest.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3"
                data-testid={`row-commitment-${interest.id}`}
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/projects/${interest.projectId}`}
                    className="text-sm font-medium hover:text-primary hover:underline"
                  >
                    {interest.projectName}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">
                    {interest.investorName}
                    {interest.investorOrg ? ` · ${interest.investorOrg}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    {currency(Number(interest.amountIntent ?? 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(interest.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          testId="panel-accounts"
          title="Accounts"
          icon={Users}
          isLoading={usersQuery.isLoading}
          error={usersQuery.error}
          isEmpty={users.length === 0}
          action={
            <Link href="/admin/users">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-users">
                Manage
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
          emptyState={<EmptyState icon={Users} title="No accounts" />}
        >
          <div className="space-y-2">
            {(["ADMIN", "DEVELOPER", "INVESTOR"] as const).map((role) => (
              <div
                key={role}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
                data-testid={`row-role-${role.toLowerCase()}`}
              >
                <span className="text-sm">
                  {role === "DEVELOPER" ? "Issuers" : role === "INVESTOR" ? "Investors" : "Admins"}
                </span>
                <span className="text-sm font-semibold">{roleCounts[role] ?? 0}</span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <span className="text-sm text-amber-600">Investors pending KYC</span>
              <span className="text-sm font-semibold text-amber-600" data-testid="text-unverified">
                {unverified}
              </span>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Quick links ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jump to</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { href: "/admin/projects", label: "Review Queue", icon: ClipboardCheck },
              { href: "/admin/distributions", label: "Distributions", icon: Banknote },
              { href: "/admin/users", label: "Users", icon: Users },
              { href: "/operations", label: "Operations", icon: Activity },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  data-testid={`link-jump-${label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
