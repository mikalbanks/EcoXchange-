import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  Bell,
  FileDown,
  TrendingUp,
  DollarSign,
  Eye,
} from "lucide-react";

const distributions = [
  { period: "May 2026", kwh: "612,840", usdc: "$83.42" },
  { period: "Apr 2026", kwh: "598,210", usdc: "$81.43" },
  { period: "Mar 2026", kwh: "541,907", usdc: "$73.78" },
  { period: "Feb 2026", kwh: "476,210", usdc: "$64.83" },
  { period: "Jan 2026", kwh: "421,030", usdc: "$57.32" },
  { period: "Dec 2025", kwh: "398,221", usdc: "$54.21" },
];

const notifications = [
  {
    when: "2 hours ago",
    text: "April 2026 production VERIFIED. $81.43 USDC distributed to your wallet.",
  },
  {
    when: "Yesterday",
    text: "Marketplace refresh: 3 new offerings opening to subscriptions next week.",
  },
];

export default function InvestorDashboardPreview() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="rounded-md border border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
          <Eye className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-primary">
              Preview — illustrative dashboard, not a live account
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Every number on this page is sample data. The real investor dashboard ships when offerings open.
            </p>
          </div>
        </div>

        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
            Your portfolio
          </p>
          <h1 className="font-serif text-3xl font-semibold md:text-4xl">Lancaster Sun Ranch · 12 MW</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            $25,000 invested · 0.20% of SPV · Settling monthly since Dec 2025
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-2">
                Live production
              </p>
              <p className="font-sans text-3xl font-bold text-primary">11.4 MW</p>
              <p className="mt-2 text-xs text-muted-foreground">Current output — sample</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-2">
                YTD yield received
              </p>
              <p className="font-sans text-3xl font-bold text-primary">$415</p>
              <p className="mt-2 text-xs text-muted-foreground">Across 6 monthly distributions</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-2">
                Projected IRR
              </p>
              <p className="font-sans text-3xl font-bold text-primary">12.4%</p>
              <p className="mt-2 text-xs text-muted-foreground">Running, based on verified months</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-2">
                Verification
              </p>
              <Badge className="bg-primary/20 text-primary hover:bg-primary/20">VERIFIED</Badge>
              <p className="mt-2 text-xs text-muted-foreground">All 3 sources agree within tolerance</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-border lg:col-span-2">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                    Verified vs. expected production
                  </p>
                  <h3 className="font-serif text-xl font-semibold">Last 6 months</h3>
                </div>
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="flex h-48 items-end gap-3">
                {distributions.slice().reverse().map((d, i) => {
                  const expectedHeight = 70 + i * 4;
                  const actualHeight = expectedHeight + (i % 2 === 0 ? 2 : -3);
                  return (
                    <div key={d.period} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-full w-full items-end gap-1">
                        <div
                          className="flex-1 rounded-t-sm bg-muted"
                          style={{ height: `${expectedHeight}%` }}
                          title={`Expected (${d.period})`}
                        />
                        <div
                          className="flex-1 rounded-t-sm bg-primary"
                          style={{ height: `${actualHeight}%` }}
                          title={`Actual (${d.period})`}
                        />
                      </div>
                      <p className="font-mono text-[0.55rem] uppercase tracking-wider text-muted-foreground">
                        {d.period.split(" ")[0]}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-4 font-mono text-[0.6rem] uppercase tracking-wider">
                <span className="flex items-center gap-2 text-primary">
                  <span className="h-2 w-2 rounded-sm bg-primary" /> Actual
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-sm bg-muted" /> Expected (NREL)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                  USDC yield history
                </p>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-3">
                {distributions.map((d) => (
                  <div
                    key={d.period}
                    className="flex items-center justify-between border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.period}</p>
                      <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                        {d.kwh} kWh
                      </p>
                    </div>
                    <p className="font-mono text-sm font-semibold text-primary">{d.usdc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                  Document downloads
                </p>
                <FileDown className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-2">
                {[
                  "Subscription agreement (PDF)",
                  "Project PPM (PDF)",
                  "PPA / off-take contract (PDF)",
                  "K-1 — 2025 tax year",
                ].map((doc) => (
                  <Button
                    key={doc}
                    variant="outline"
                    size="sm"
                    disabled
                    className="w-full justify-start text-xs"
                  >
                    <FileDown className="h-3 w-3" />
                    {doc}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                  Notifications
                </p>
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.text} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <div>
                      <p className="text-sm">{n.text}</p>
                      <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                        {n.when}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="font-mono text-[0.6rem] text-muted-foreground/70">
          Preview only. <TrendingUp className="inline h-3 w-3" /> Real dashboard ships at offering launch.
        </p>
      </main>
    </div>
  );
}
