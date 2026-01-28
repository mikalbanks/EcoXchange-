import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { 
  FileStack, 
  DollarSign,
  Building2
} from "lucide-react";
import type { Offering } from "@shared/schema";

interface OfferingWithDetails extends Offering {
  projectName: string;
  issuerEmail: string;
  totalCommitments: number;
}

export default function AdminOfferings() {
  const { data: offerings, isLoading } = useQuery<OfferingWithDetails[]>({
    queryKey: ["/api/admin/offerings"],
  });

  return (
    <DashboardLayout
      title="All Offerings"
      description="Platform-wide offering overview"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Offerings" }
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Offerings</CardTitle>
          <CardDescription>
            All offerings across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between p-4 border rounded-lg">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : !offerings?.length ? (
            <EmptyState
              icon={FileStack}
              title="No offerings"
              description="Platform offerings will appear here"
            />
          ) : (
            <div className="space-y-4">
              {offerings.map((offering) => (
                <div 
                  key={offering.id} 
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border gap-4"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-medium">{offering.name}</p>
                      <StatusBadge status={offering.status} type="offering" />
                      <Badge variant="outline" className="capitalize">
                        {offering.securityType.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{offering.projectName}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {offering.issuerEmail}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Target: ${Number(offering.targetRaise).toLocaleString()}
                      </span>
                      <span>
                        {offering.totalCommitments} commitment{offering.totalCommitments !== 1 ? "s" : ""}
                      </span>
                    </div>
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
