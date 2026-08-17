import { Header } from "@/components/header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What is an EcoXchange Solar Note (ESN)?",
    a: "A project-level equity interest in the LLC that owns one permitted U.S. solar project. One project, one SPV — not a pooled fund. A permissioned digital record may support ownership administration, but it does not create a separate cryptocurrency product; the offering documents govern the investment.",
  },
  {
    q: "What is the minimum investment?",
    a: "$10,000 per offering. The instrument is available only to verified accredited investors under Reg D 506(c).",
  },
  {
    q: "What is the target return?",
    a: "Each offering's documents may present project-specific target returns based on its PPA, operating assumptions, capital structure, tax-credit treatment, and risks. Targets are estimates, not promises, and no current pipeline figure should be read as an available investment return.",
  },
  {
    q: "How are distributions verified?",
    a: "Every month our verification engine reconciles inverter telemetry, utility-meter data, and modeled expected generation. Agreement within the project's tolerances produces a VERIFIED determination and marks the project distribution-eligible. A FLAGGED or incomplete result remains on hold for review.",
  },
  {
    q: "How often do I get paid?",
    a: "The target is to begin eligible distribution processing within 72 hours after all required month-end source data is received and confirmed. Flagged, pending, and incomplete records are excluded from that target until review is complete. Payment method and timing are governed by each offering's documents.",
  },
  {
    q: "What fees do investors pay?",
    a: "Zero direct fees. All EcoXchange fees — 3% origination, $15,000 setup, 0.5% AUA servicing — are paid by the project SPV. Investor returns are quoted net of these fees.",
  },
  {
    q: "What if the project underperforms?",
    a: "NREL's 2020 fleet study found that real-world solar plants degrade faster than many projections. EcoXchange surfaces this monthly so investors see underperformance in near-real time. Distributions follow verified production.",
  },
  {
    q: "How is my investment taxed?",
    a: "K-1 pass-through. The SPV's tax attributes flow through to investors via an annual Schedule K-1. EcoXchange coordinates K-1 preparation; investors should consult their own tax advisor.",
  },
  {
    q: "Can I sell before maturity?",
    a: "Not at launch. Phase 2 of the roadmap is listing ESNs on a FINRA-regulated ATS, enabling peer-to-peer secondary trading between verified accredited investors. Plan to hold to maturity until secondary liquidity is operational.",
  },
  {
    q: "What is the asset life?",
    a: "20–25 years, aligned with standard PPA tenor and module manufacturer warranties. NREL field data shows meaningful output retained at year 25 for well-maintained crystalline-silicon systems.",
  },
  {
    q: "How is my ownership recorded?",
    a: "The transfer agent maintains the official ownership record. EcoXchange may use a permissioned digital account to support administration, reporting, and eligible distributions, but your rights come from the project LLC interest and its offering documents.",
  },
  {
    q: "What stops a developer from gaming the meter?",
    a: "The reconciliation engine. Inverter data comes from the project monitoring system, utility-meter data comes from the serving utility, and modeled expected generation is derived from NASA/NREL weather inputs and project specifications. Disagreement triggers a FLAGGED status and pauses distribution eligibility until review.",
  },
  {
    q: "Is the ITC included?",
    a: "Where applicable, federal incentives and depreciation are reflected in the deal structure and offering documents. Legislative risk disclosure appears in every offering package.",
  },
  {
    q: "What is the legal structure?",
    a: "Reg D 506(c) private placement to verified accredited investors. General solicitation is permitted, and securities counsel reviews every offering before launch.",
  },
];

export default function FaqPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main public-main-narrow">
        <section className="public-hero">
          <p className="public-eyebrow">Frequently asked</p>
          <h1 className="public-title">
            Questions worth
            <br />
            <em>answering.</em>
          </h1>
          <p className="public-copy">
            What an investor or developer typically asks before — or after — a first conversation.
          </p>
        </section>

        <section className="public-section">
          <div className="public-faq-panel">
            <Accordion type="single" collapsible>
              {FAQS.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <p className="mt-10 font-mono text-[0.6rem] text-muted-foreground/70">
            All financial figures, target returns, and tax-treatment descriptions are illustrative and subject to
            counsel review. They will be restated, with full risk factors, in each project's offering documents at
            launch. No offering is currently open.
          </p>
        </section>
      </main>
    </div>
  );
}
