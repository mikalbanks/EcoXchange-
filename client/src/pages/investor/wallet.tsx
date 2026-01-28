import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  Banknote,
  Receipt
} from "lucide-react";
import type { LedgerEntry } from "@shared/schema";

interface WalletStats {
  balance: number;
  totalDeposits: number;
  totalReserved: number;
  totalPayouts: number;
}

interface LedgerEntryWithDetails extends LedgerEntry {
  memo: string | null;
}

const entryTypeIcons: Record<string, typeof ArrowDownCircle> = {
  DEPOSIT: ArrowDownCircle,
  WITHDRAWAL: ArrowUpCircle,
  RESERVE: Lock,
  RELEASE: Unlock,
  PAYOUT: Banknote,
};

const entryTypeColors: Record<string, string> = {
  DEPOSIT: "text-emerald-500 bg-emerald-500/10",
  WITHDRAWAL: "text-red-500 bg-red-500/10",
  RESERVE: "text-yellow-500 bg-yellow-500/10",
  RELEASE: "text-blue-500 bg-blue-500/10",
  PAYOUT: "text-primary bg-primary/10",
};

export default function InvestorWallet() {
  const { data: stats, isLoading: statsLoading } = useQuery<WalletStats>({
    queryKey: ["/api/investor/wallet/stats"],
  });

  const { data: entries, isLoading: entriesLoading } = useQuery<LedgerEntryWithDetails[]>({
    queryKey: ["/api/investor/wallet/entries"],
  });

  return (
    <DashboardLayout
      title="Wallet"
      description="USDC Demo Balance & Transaction History"
      breadcrumbs={[
        { label: "Investor", href: "/investor" },
        { label: "Wallet" }
      ]}
    >
      <div className="mb-6">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
          Demo Mode: USDC (Simulated)
        </Badge>
      </div>

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
              title="Available Balance"
              value={`$${(stats?.balance ?? 0).toLocaleString()}`}
              description="USDC (Demo)"
              icon={Wallet}
            />
            <StatsCard
              title="Total Deposits"
              value={`$${(stats?.totalDeposits ?? 0).toLocaleString()}`}
              icon={ArrowDownCircle}
            />
            <StatsCard
              title="Reserved"
              value={`$${(stats?.totalReserved ?? 0).toLocaleString()}`}
              description="Committed to investments"
              icon={Lock}
            />
            <StatsCard
              title="Distributions Received"
              value={`$${(stats?.totalPayouts ?? 0).toLocaleString()}`}
              icon={Banknote}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <CardDescription>
            All ledger entries for your demo USDC wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between p-4 border rounded-lg">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : !entries?.length ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Your ledger entries will appear here"
            />
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const Icon = entryTypeIcons[entry.type] || Receipt;
                const colorClass = entryTypeColors[entry.type] || "text-muted-foreground bg-muted";
                const isCredit = entry.type === "DEPOSIT" || entry.type === "RELEASE" || entry.type === "PAYOUT";
                
                return (
                  <div 
                    key={entry.id} 
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{entry.type.toLowerCase().replace("_", " ")}</p>
                        {entry.memo && (
                          <p className="text-sm text-muted-foreground">{entry.memo}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold ${isCredit ? "text-emerald-500" : "text-red-500"}`}>
                      {isCredit ? "+" : "-"}${Number(entry.amount).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
