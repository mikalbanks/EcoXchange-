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
    a: "A fractional LLC membership interest in a single permitted U.S. solar project SPV, issued as an ERC-3643 compliant security token on Base. One project, one SPV — not a pooled fund. Distributions are paid in USDC.",
  },
  {
    q: "What is the minimum investment?",
    a: "$10,000 per offering. The instrument is available only to verified accredited investors under Reg D 506(c).",
  },
  {
    q: "What is the target return?",
    a: "Underlying project pro-formas target a 6–8% cash distribution per year, paid monthly in USDC, and a net IRR of 10–14% over the 20–25 year asset life. Figures are project-specific and depend on PPA, capital structure, and tax-credit treatment.",
  },
  {
    q: "How are distributions verified?",
    a: "Every month our verification engine reconciles three independent measurements — inverter API, utility net-meter, and satellite-derived expected production. If they agree within tolerance, the run is VERIFIED and the smart contract pays out. If any diverge, the run is FLAGGED and held for review before distribution.",
  },
  {
    q: "How often do I get paid?",
    a: "Monthly. Target: USDC received within 72 hours of month-end production data confirmation. This replaces the traditional 30–90 day manual quarterly cycle.",
  },
  {
    q: "What fees do investors pay?",
    a: "Zero direct fees. All EcoXchange fees — 3% origination, $15,000 setup, 1.25% AUA servicing — are paid by the project SPV. Investor returns are quoted net of these fees.",
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
    q: "Who custody my tokens?",
    a: "You do. Privy provisions an embedded wallet you control via email or phone login. The transfer agent maintains the on-chain cap table per SEC requirements.",
  },
  {
    q: "What stops a developer from gaming the meter?",
    a: "The reconciliation engine. Inverter data comes from the developer, but utility-meter data comes from the regulated utility and satellite irradiance comes from NASA/NREL. The developer cannot manipulate all three. Disagreement triggers a FLAGGED status and freezes the distribution until reviewed.",
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
