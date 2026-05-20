import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Zap,
  Cpu,
  KeyRound,
  Plug,
  FileText,
  Network,
  DollarSign,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Location", icon: MapPin },
  { id: 2, label: "Capacity", icon: Zap },
  { id: 3, label: "Inverter", icon: Cpu },
  { id: 4, label: "API access", icon: KeyRound },
  { id: 5, label: "Utility", icon: Plug },
  { id: 6, label: "Off-take", icon: FileText },
  { id: 7, label: "Interconnect", icon: Network },
  { id: 8, label: "Raise", icon: DollarSign },
];

export function DeveloperSubmissionWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");
  const [capacityKw, setCapacityKw] = useState("");
  const [inverter, setInverter] = useState("");
  const [plantId, setPlantId] = useState("");
  const [utilityProvider, setUtilityProvider] = useState("");
  const [bayouConsent, setBayouConsent] = useState(false);
  const [offtake, setOfftake] = useState("");
  const [interconnect, setInterconnect] = useState("");
  const [raise, setRaise] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canAdvance = () => {
    if (step === 1) return state.length === 2 && county !== "";
    if (step === 2) return parseInt(capacityKw, 10) >= 100;
    if (step === 3) return inverter !== "";
    if (step === 4) return plantId !== "";
    if (step === 5) return utilityProvider !== "" && bayouConsent;
    if (step === 6) return offtake !== "";
    if (step === 7) return interconnect !== "";
    if (step === 8) {
      const r = parseInt(raise, 10);
      return r >= 1000000 && r <= 5000000 && contactEmail.includes("@");
    }
    return false;
  };

  function handleSubmit() {
    const subject = encodeURIComponent(`Developer submission — ${state}, ${capacityKw} kW`);
    const body = encodeURIComponent(
      `New developer submission via /develop preview wizard.\n\n` +
        `Contact email: ${contactEmail}\n` +
        `Location: ${county}, ${state}\n` +
        `System capacity: ${capacityKw} kW dc\n` +
        `Inverter brand: ${inverter}\n` +
        `Plant / portal ID: ${plantId}\n` +
        `Utility: ${utilityProvider} (Bayou consent: ${bayouConsent ? "yes" : "no"})\n` +
        `Off-take notes: ${offtake}\n` +
        `Interconnect notes: ${interconnect}\n` +
        `Equity raise requested: $${raise}\n\n` +
        `Target intake-to-live timeline: 2-4 weeks.`,
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
          <h3 className="font-serif text-2xl font-semibold">Submission received.</h3>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Target intake-to-live offering timeline: <strong className="text-foreground">2–4 weeks</strong>. Our team
            will reach out within two business days to schedule a project review and start the backtest.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6 md:p-10">
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
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Project location</h3>
            <p className="text-sm text-muted-foreground">
              State and county determine PPA benchmarks, ISO, and incentive structure.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  State (2-letter)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  placeholder="CA"
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  County
                </label>
                <input
                  type="text"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="Los Angeles"
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">System capacity</h3>
            <p className="text-sm text-muted-foreground">
              dc nameplate. EcoXchange currently underwrites projects in the 1–20 MW band (1,000–20,000 kW dc).
            </p>
            <div>
              <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Capacity (kW dc)
              </label>
              <input
                type="number"
                min={100}
                value={capacityKw}
                onChange={(e) => setCapacityKw(e.target.value)}
                placeholder="5000"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Inverter brand</h3>
            <p className="text-sm text-muted-foreground">
              We currently support SolarEdge, Enphase, Fronius, and SMA monitoring portals. Other brands require
              a manual telemetry connector.
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {["SolarEdge", "Enphase", "Fronius", "SMA", "Other"].map((b) => (
                <label
                  key={b}
                  className={`flex cursor-pointer items-center justify-center rounded-md border px-4 py-3 transition-colors ${
                    inverter === b
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="inverter"
                    value={b}
                    checked={inverter === b}
                    onChange={(e) => setInverter(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold">{b}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Inverter portal access</h3>
            <p className="text-sm text-muted-foreground">
              Provide the plant / site ID we'll use to pull production data. At launch you'll authorize API
              access through the monitoring portal — no key paste required.
            </p>
            <div>
              <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Plant / portal ID
              </label>
              <input
                type="text"
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                placeholder="e.g. 1234567"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For security, do not paste production API keys into this preview form. Real credentials are
              exchanged through OAuth at offering setup.
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Utility provider</h3>
            <p className="text-sm text-muted-foreground">
              We reconcile inverter data against utility net-meter data via Bayou — a regulated third-party
              utility data provider — so investors see an independent confirmation of every kWh.
            </p>
            <div>
              <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Utility (e.g. PG&E, ConEd, Eversource)
              </label>
              <input
                type="text"
                value={utilityProvider}
                onChange={(e) => setUtilityProvider(e.target.value)}
                placeholder="PG&E"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4 hover:bg-muted/30">
              <input
                type="checkbox"
                checked={bayouConsent}
                onChange={(e) => setBayouConsent(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                I'll authorize Bayou to access utility data for this account when the project goes live.
              </span>
            </label>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Off-take / PPA</h3>
            <p className="text-sm text-muted-foreground">
              Briefly describe your off-take arrangement: counterparty, tenor, price, and escalator.
            </p>
            <div>
              <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Off-take notes
              </label>
              <textarea
                rows={5}
                value={offtake}
                onChange={(e) => setOfftake(e.target.value)}
                placeholder="20-year PPA with [Utility]. $42/MWh, 1.5% annual escalator. Or: state community-solar program (NY VDER), etc."
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Interconnection</h3>
            <p className="text-sm text-muted-foreground">
              Summarize your interconnection status. At launch you'll upload your executed Interconnection
              Agreement; here just describe it in a sentence.
            </p>
            <div>
              <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Interconnection notes
              </label>
              <textarea
                rows={4}
                value={interconnect}
                onChange={(e) => setInterconnect(e.target.value)}
                placeholder="Executed Interconnection Agreement signed Q2 2026. Queue position #1234 in CAISO Cluster 15."
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold">Equity raise & contact</h3>
            <p className="text-sm text-muted-foreground">
              EcoXchange currently underwrites equity raises between $1M and $5M per project. SPV pays 3% origination
              + $15,000 setup at close, then 1.25% AUA / year billed monthly.
            </p>
            <div>
              <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Equity raise requested (USD)
              </label>
              <input
                type="number"
                min={1000000}
                max={5000000}
                step={50000}
                value={raise}
                onChange={(e) => setRaise(e.target.value)}
                placeholder="2500000"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Contact email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@developer.com"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

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
            <Button onClick={handleSubmit} disabled={!canAdvance()}>
              Submit project <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="mt-6 font-mono text-[0.6rem] text-muted-foreground/70">
          Preview / intake form. Submission opens a conversation; final terms are set in writing after
          underwriting and securities-counsel review.
        </p>
      </CardContent>
    </Card>
  );
}
