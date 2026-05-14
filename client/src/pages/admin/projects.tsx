import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardCheck } from "lucide-react";

interface AdminProject {
  id: string;
  name: string;
  technology: string;
  stage: string;
  state: string;
  county: string;
  capacityMW: string | null;
  status: string;
  developerName: string;
  developerOrg: string | null;
  readinessScore: {
    score: number;
    rating: string;
  } | null;
}

export default function AdminProjects() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ratingFilter, setRatingFilter] = useState("ALL");

  const { data: projects, isLoading, error } = useQuery<AdminProject[]>({
    queryKey: ["/api/admin/projects"],
  });

  const filteredProjects = projects?.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (ratingFilter !== "ALL") {
      if (!p.readinessScore) return false;
      if (p.readinessScore.rating !== ratingFilter) return false;
    }
    return true;
  });

  if (error) {
    return (
      <DashboardLayout
        title="Review Queue"
        description="Review and manage offering submissions for compliance"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Review Queue" },
        ]}
      >
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive" data-testid="text-error">
              Failed to load projects. Please try again later.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Review Queue"
      description="Review and manage offering submissions for compliance"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Review Queue" },
      ]}
    >
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-rating-filter">
            <SelectValue placeholder="Filter by rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Ratings</SelectItem>
            <SelectItem value="GREEN">Green</SelectItem>
            <SelectItem value="YELLOW">Yellow</SelectItem>
            <SelectItem value="RED">Red</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !filteredProjects?.length ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No projects found"
              description="No projects match the current filters."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>MW</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Readiness</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    data-testid={`row-project-${project.id}`}
                  >
                    <TableCell>
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="font-medium hover:underline"
                        data-testid={`link-project-${project.id}`}
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-sm" data-testid={`text-developer-${project.id}`}>
                          {project.developerName}
                        </span>
                        {project.developerOrg && (
                          <span className="block text-xs text-muted-foreground">
                            {project.developerOrg}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.state}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.capacityMW ?? "N/A"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.stage.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} type="project" />
                    </TableCell>
                    <TableCell>
                      {project.readinessScore ? (
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={project.readinessScore.rating}
                            type="readiness"
                          />
                          <span className="text-xs text-muted-foreground">
                            {project.readinessScore.score}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
