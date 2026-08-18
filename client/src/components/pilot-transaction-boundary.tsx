import { Link } from "wouter";
import { LockKeyhole } from "lucide-react";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";

export function PilotTransactionBoundary({ surface }: { surface: string }) {
  return (
    <div className="public-page" data-testid="pilot-transaction-boundary">
      <Header />
      <main className="public-main public-main-narrow">
        <section className="public-hero">
          <p className="public-eyebrow">Verification-only pilot</p>
          <h1 className="public-title">{surface} is not live.</h1>
          <p className="public-copy">
            Release 1 demonstrates production verification and source provenance. It does not host an open
            offering, accept an investment commitment, create an ownership record, or execute a payment.
          </p>
        </section>
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-6">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div>
              <p className="font-semibold">This workflow fails closed until its authoritative systems and approvals are connected.</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <Link href="/performance" className="font-semibold text-primary">Review production evidence</Link>
                <Link href="/develop" className="font-semibold text-muted-foreground">View pilot scope</Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
