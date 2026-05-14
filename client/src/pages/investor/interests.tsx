import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  FileSearch,
  DollarSign,
  Calendar,
  MapPin,
  ArrowRight,
  Search,
} from "lucide-react";

interface InvestorInterest {
  id: string;
  projectId: string;
  projectName: string;
  projectState: string;
  amountIntent: string | null;
  structurePreference: string;
  timeline: string;
  status: string;
  createdAt: string;
}

function formatCurrency(value: string | number | null): string {
  if (!value) return "$0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
}

function formatTimeline(t: string): string {
  switch (t) {
    case "IMMEDIATE": return "Immediate";
    case "DAYS_30_60": return "30-60 Days";
    case "DAYS_60_90": return "60-90 Days";
    default: return "Unknown";
  }
}

export default function InvestorInterests() {
  const { data: interests, isLoading } = useQuery<InvestorInterest[]>({
    queryKey: ["/api/investor/interests"],
  });

  return (
    <DashboardLayout
      title="My Investments"
      description="Track your submitted investment commitments"
      breadcrumbs={[
        { label: "Investor", href: "/investor" },
        { label: "My Investments" },
      ]}
    >
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : !interests?.length ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={FileSearch}
              title="No investments yet"
              description="Browse approved offerings to invest in renewable energy project securities."
              action={
                <Link href="/investor/deals">
                  <Button className="gap-2 mt-2" data-testid="button-browse-deals">
                    <Search className="h-4 w-4" />
                    Browse Offerings
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {interests.map((interest) => (
            <Card key={interest.id} data-testid={`card-interest-${interest.id}`}>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold" data-testid={`text-interest-project-${interest.id}`}>
                        {interest.projectName}
                      </h3>
                      <StatusBadge status={interest.status} type="interest" />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {interest.projectState && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {interest.projectState}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatCurrency(interest.amountIntent)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatTimeline(interest.timeline)}
                      </span>
                      <span>
                        {interest.structurePreference === "EQUITY" ? "Equity" : interest.structurePreference === "PREFERRED" ? "Preferred" : "Flexible"}
                      </span>
                    </div>
                  </div>
                  <Link href={`/investor/deals/${interest.projectId}`}>
                    <Button variant="outline" size="sm" className="gap-1" data-testid={`button-view-deal-${interest.id}`}>
                      View Offering
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
