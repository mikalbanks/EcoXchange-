import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { IdentityVerificationCard } from "@/components/identity-verification-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  AlertTriangle,
  Search,
  FileSearch,
  DollarSign,
  Calendar,
  MapPin,
  ArrowRight,
} from "lucide-react";

interface InvestorInterest {
  id: string;
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
  if (isNaN(num)) return "$0";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeline(timeline: string): string {
  switch (timeline) {
    case "IMMEDIATE": return "Immediate";
    case "DAYS_30_60": return "30-60 Days";
    case "DAYS_60_90": return "60-90 Days";
    case "UNKNOWN": return "Unknown";
    default: return timeline;
  }
}

export default function InvestorDashboard() {
  const { user } = useAuth();

  const { data: interests, isLoading, error } = useQuery<InvestorInterest[]>({
    queryKey: ["/api/investor/interests"],
  });

  return (
    <DashboardLayout
      title="Investor Overview"
      description={`Welcome back, ${user?.name || "Investor"}`}
      actions={
        <Link href="/investor/deals">
          <Button className="gap-2" data-testid="button-browse-deals">
            <Search className="h-4 w-4" />
            Browse Offerings
          </Button>
        </Link>
      }
    >
      <Card className="mb-6 border-yellow-500/30 bg-yellow-500/10">
        <CardContent className="p-4 flex items-center gap-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
          <p className="text-sm text-yellow-500" data-testid="text-disclaimer-banner">
            EcoXchange is a digital securities platform. Securities are asset-backed and yield-generating. All participants must complete KYC/AML verification. Secondary trading is simulated in Phase 1.
          </p>
        </CardContent>
      </Card>

      <div className="mb-6">
        <IdentityVerificationCard />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg" data-testid="text-interests-title">My Investments</CardTitle>
          <Link href="/investor/deals">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-browse-deals-link">
              Browse Offerings
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3 opacity-50" />
              <p className="text-destructive" data-testid="text-error-message">Failed to load interests</p>
            </div>
          ) : !interests?.length ? (
            <EmptyState
              icon={FileSearch}
              title="No investments yet"
              description="Browse available offerings and invest in digital securities to get started."
              action={
                <Link href="/investor/deals">
                  <Button size="sm" className="gap-2" data-testid="button-browse-deals-empty">
                    <Search className="h-4 w-4" />
                    Browse Offerings
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {interests.map((interest, index) => (
                <div
                  key={interest.id || index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border gap-3"
                  data-testid={`card-interest-${interest.id || index}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium" data-testid={`text-interest-project-${interest.id || index}`}>
                        {interest.projectName}
                      </span>
                      <StatusBadge status={interest.status} type="interest" />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {interest.projectState}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatCurrency(interest.amountIntent)}
                      </span>
                      <span>{interest.structurePreference.replace(/_/g, " ")}</span>
                      <span>{formatTimeline(interest.timeline)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                    <Calendar className="h-3.5 w-3.5" />
                    <span data-testid={`text-interest-date-${interest.id || index}`}>
                      {formatDate(interest.createdAt)}
                    </span>
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
