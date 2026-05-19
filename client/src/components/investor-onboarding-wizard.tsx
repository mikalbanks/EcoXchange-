import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, ArrowLeft, ShieldCheck, Wallet, FileSignature, DollarSign, UserCheck } from "lucide-react";

const STEPS = [
  { id: 1, label: "Accreditation", icon: ShieldCheck },
  { id: 2, label: "KYC / AML", icon: UserCheck },
  { id: 3, label: "Wallet", icon: Wallet },
  { id: 4, label: "Subscription", icon: FileSignature },
  { id: 5, label: "Funding", icon: DollarSign },
];

export function InvestorOnboardingWizard() {
  const [step, setStep] = useState(1);
  const [accreditation, setAccreditation] = useState("");
  const [legalName, setLegalName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [fundingMethod, setFundingMethod] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canAdvance = () => {
    if (step === 1) return accreditation !== "";
    if (step === 2) return legalName !== "" && dob !== "" && address !== "";
    if (step === 3) return true;
    if (step === 4) return subscribed;
    if (step === 5) return amount !== "" && parseInt(amount, 10) >= 10000;
    return false;
  };

  function handleSubmit() {
    const subject = encodeURIComponent(`Investor onboarding preview — ${legalName || email}`);
    const body = encodeURIComponent(
      `New investor onboarding preview submission.\n\n` +
        `Email: ${email}\n` +
        `Legal name: ${legalName}\n` +
        `Accreditation basis: ${accreditation}\n` +
        `Intended funding method: ${fundingMethod}\n` +
        `Intended ticket: $${amount}\n\n` +
        `Submitted via /market#onboard.`,
    );
    window.location.href = `mailto:contact@ecoxchange.net?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-serif text-2xl font-semibold">You're on the early-investor list.</h3>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            We'll email you the moment a live offering matches your accreditation. Real KYC, wallet creation, and
            USDC funding happen at offering launch through Persona, Privy, and Circle.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6 md:p-10">
        {/* Stepper */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
              Step {step} of {STEPS.length}
            </p>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-primary">
              {STEPS[step - 1].label}
            </p>
          </div>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="mt-4 hidden grid-cols-5 gap-2 md:grid">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isDone = s.id < step;
              const isActive = s.id === step;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : isDone
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-muted/30"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive || isDone ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span
                    className={`font-mono text-[0.6rem] uppercase tracking-wider ${
                      isActive || isDone ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Verify accredited investor status</h3>
            <p className="text-sm text-muted-foreground">
              Select the basis on which you qualify. At launch, Parallel Markets or VerifyInvestor will collect
              supporting documents.
            </p>
            <div className="space-y-2">
              {[
                { id: "income", label: "Income: $200K individual / $300K joint over 2 years" },
                { id: "networth", label: "Net worth: $1M+ excluding primary residence" },
                { id: "professional", label: "Professional certification (Series 7, 65, 82)" },
                { id: "entity", label: "Entity with $5M+ assets" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors ${
                    accreditation === opt.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="accreditation"
                    value={opt.id}
                    checked={accreditation === opt.id}
                    onChange={(e) => setAccreditation(e.target.value)}
                    className="mt-1"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Identity verification</h3>
            <p className="text-sm text-muted-foreground">
              Persona will capture identity documents and biometrics at launch. These fields are illustrative.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Full legal name
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Jane Q. Investor"
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Residential address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Your secure wallet</h3>
            <p className="text-sm text-muted-foreground">
              Privy creates an embedded wallet at launch. You sign in with email or phone — no seed phrase, no
              extension, no crypto experience required.
            </p>
            <div className="rounded-md border border-border bg-muted/30 p-5">
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-2">
                Sample wallet address (illustrative)
              </p>
              <p className="font-mono text-sm break-all">0x9F8a3e21Cf42b8d17b9c2A4D6e89dC7f0a31b7C2D</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Distributions arrive here monthly in USDC on Base. You can withdraw to a bank at any time.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Subscription summary</h3>
            <p className="text-sm text-muted-foreground">
              At launch you'll sign a project-specific subscription agreement electronically. Below is an
              illustrative summary of the terms you'd see for an active offering.
            </p>
            <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-muted/30 p-5 text-xs text-muted-foreground space-y-3">
              <p><strong className="text-foreground">Instrument:</strong> Fractional LLC membership in a single permitted U.S. solar project SPV (the "EcoXchange Solar Note" or ESN).</p>
              <p><strong className="text-foreground">Offering type:</strong> Reg D 506(c) — verified accredited investors only.</p>
              <p><strong className="text-foreground">Minimum ticket:</strong> $10,000.</p>
              <p><strong className="text-foreground">Target cash yield:</strong> 6–8% per year, paid monthly in USDC. Target net IRR 10–14% over 20–25 year asset life.</p>
              <p><strong className="text-foreground">Tax treatment:</strong> K-1 pass-through.</p>
              <p><strong className="text-foreground">Fees (all paid by the SPV):</strong> 3% origination at close, $15,000 setup at close, 1.25% AUA servicing per year.</p>
              <p>Subject to securities counsel review and project-specific offering documents.</p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4 hover:bg-muted/30">
              <input
                type="checkbox"
                checked={subscribed}
                onChange={(e) => setSubscribed(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                I understand this is a preview. When a live offering opens, I'll sign electronically through the
                platform.
              </span>
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Funding</h3>
            <p className="text-sm text-muted-foreground">
              At launch, fund your subscription with USDC directly, or with a bank transfer that Circle converts
              into USDC. Tell us what you'd like to commit and we'll be in touch when a matching offering opens.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["USDC", "ACH"] as const).map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center justify-center rounded-md border px-4 py-3 transition-colors ${
                    fundingMethod === m
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="funding"
                    value={m}
                    checked={fundingMethod === m}
                    onChange={(e) => setFundingMethod(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold">{m === "USDC" ? "USDC direct" : "ACH → USDC"}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Intended ticket size (USD, $10,000 minimum)
              </label>
              <input
                type="number"
                min={10000}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25000"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canAdvance() || !email}>
              Join the investor list <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="mt-6 font-mono text-[0.6rem] text-muted-foreground/70">
          Preview only. No offering is currently open. Submitting this form does not constitute an investment.
          EcoXchange offerings are restricted to verified accredited investors under Reg D 506(c).
        </p>
      </CardContent>
    </Card>
  );
}
