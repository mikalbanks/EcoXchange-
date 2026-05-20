import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileDown, Users, ArrowUpRight } from "lucide-react";

const projects = [
  { name: "Lancaster Sun Ranch", state: "CA", capacity: "12 MW", status: "LIVE OFFERING", raise: "$2.4M" },
  { name: "Marin Hill Community Solar", state: "CA", capacity: "5 MW", status: "DOCUMENTATION", raise: "$1.2M" },
  { name: "Tucson East Array", state: "AZ", capacity: "8 MW", status: "VERIFICATION", raise: "$1.8M" },
  { name: "Hartford Commons", state: "CT", capacity: "3 MW", status: "INTAKE", raise: "$0.9M" },
];

const distributions = [
  { period: "May 2026", project: "Lancaster Sun Ranch", paid: "$14,820" },
  { period: "Apr 2026", project: "Lancaster Sun Ranch", paid: "$14,470" },
  { period: "Mar 2026", project: "Lancaster Sun Ranch", paid: "$13,100" },
];

const documents = [
  "Lancaster Sun Ranch — PPM v2.pdf",
  "Lancaster Sun Ranch — Interconnection Agreement.pdf",
  "Lancaster Sun Ranch — PPA executed.pdf",
  "Marin Hill — Permit packet.zip",
];

function statusVariant(status: string) {
  if (status === "LIVE OFFERING") return "bg-primary/20 text-primary";
  if (status === "DOCUMENTATION") return "bg-yellow-500/10 text-yellow-700";
  if (status === "VERIFICATION") return "bg-blue-500/10 text-blue-700";
  return "bg-muted text-muted-foreground";
}

export default function DeveloperDashboardPreview() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="rounded-md border border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
          <Eye className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-primary">
              Preview — illustrative pipeline
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sample developer view across four projects. Real pipeline replaces this at launch.
            </p>
          </div>
        </div>

        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
            Developer pipeline
          </p>
          <h1 className="font-serif text-3xl font-semibold md:text-4xl">Your projects</h1>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-border">
            <CardContent className="p-5">
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-2">
                Total committed
              </p>
              <p className="font-sans text-3xl font-bold text-primary">$1.4M</p>
              <p className="mt-2 text-xs text-muted-foreground">Across active offerings</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-2">
                Active investors
              </p>
              <p className="font-sans text-3xl font-bold text-primary">42</p>
              <p className="mt-2 text-xs text-muted-foreground">Verified accredited</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground mb-2">
                Distributions paid
              </p>
              <p className="font-sans text-3xl font-bold text-primary">$42,390</p>
              <p className="mt-2 text-xs text-muted-foreground">Last 3 months, all VERIFIED</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardContent className="p-0">
            <div className="grid grid-cols-5 border-b border-border bg-muted/40 px-5 py-3">
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground col-span-2">
                Project
              </p>
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">Location</p>
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">Raise</p>
              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">Status</p>
            </div>
            {projects.map((p, i) => (
              <div
                key={p.name}
                className={`grid grid-cols-5 items-center px-5 py-4 ${
                  i < projects.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <div className="col-span-2">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                    {p.capacity} dc
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{p.state}</p>
                <p className="text-sm font-mono text-primary">{p.raise}</p>
                <Badge className={`${statusVariant(p.status)} hover:bg-current/20`}>{p.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                  Distribution history
                </p>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-3">
                {distributions.map((d) => (
                  <div
                    key={`${d.period}-${d.project}`}
                    className="flex items-center justify-between border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.period}</p>
                      <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                        {d.project}
                      </p>
                    </div>
                    <p className="font-mono text-sm font-semibold text-primary">{d.paid}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                  Document repository
                </p>
                <FileDown className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-2">
                {documents.map((d) => (
                  <Button
                    key={d}
                    variant="outline"
                    size="sm"
                    disabled
                    className="w-full justify-start text-xs"
                  >
                    <FileDown className="h-3 w-3" />
                    {d}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="font-mono text-[0.6rem] text-muted-foreground/70">
          Preview only. <ArrowUpRight className="inline h-3 w-3" /> Real developer dashboard replaces this view at launch.
        </p>
      </main>
    </div>
  );
}
