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
    a: "A fractional LLC membership interest in a single permitted U.S. solar project SPV, issued as an ERC-3643 compliant security token on Base (Coinbase's L2). One project, one SPV — not a pooled fund. Distributions are paid in USDC.",
  },
  {
    q: "What is the minimum investment?",
    a: "$10,000 per offering. The instrument is available only to verified accredited investors under Reg D 506(c).",
  },
  {
    q: "What is the target return?",
    a: "Underlying project pro-formas target a 6–8% cash distribution per year, paid monthly in USDC, and a net IRR of 10–14% over the 20–25 year asset life. Both figures are project-specific, subject to securities counsel review, and depend on the offering's PPA, capital structure, and federal tax-credit treatment.",
  },
  {
    q: "How are distributions verified?",
    a: "Every month our verification engine reconciles three independent measurements — inverter API, utility net-meter (via Bayou), and satellite-derived expected production (NASA POWER / NREL NSRDB). If they agree within tolerance, the run is VERIFIED and the smart contract pays out. If any diverge, the run is FLAGGED and held for review before any distribution.",
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
    a: "NREL's 2020 fleet study found that real-world solar plants degrade ~1.3%/yr on average, vs. the 0.5–0.75%/yr typically projected. Our verification engine surfaces this monthly so you see underperformance in near-real time — not years later through K-1 pattern recognition. Distributions follow verified production. Performance covenants can also be encoded in the SPV's smart contract.",
  },
  {
    q: "How is my investment taxed?",
    a: "K-1 pass-through. The SPV's tax attributes (ITC, MACRS depreciation, ordinary income / loss) flow through to investors via an annual Schedule K-1. EcoXchange coordinates K-1 preparation; consult your own tax advisor for personal applicability.",
  },
  {
    q: "Can I sell before maturity?",
    a: "Not at launch. Phase 2 of our roadmap is listing ESNs on a FINRA-regulated ATS, enabling peer-to-peer secondary trading between verified accredited investors. Plan to hold to maturity until secondary liquidity is operational.",
  },
  {
    q: "What is the asset life?",
    a: "20–25 years, aligned with standard PPA tenor and module manufacturer warranties. NREL field data shows ~88% of original output retained at year 25 for well-maintained crystalline-silicon systems.",
  },
  {
    q: "Who custody my tokens?",
    a: "You do. Privy provisions an embedded wallet you control via email/phone login — no seed phrase. The transfer agent (Securitize or Tokeny) maintains the on-chain cap table per SEC requirements.",
  },
  {
    q: "What stops a developer from gaming the meter?",
    a: "The reconciliation engine. Inverter data comes from the developer, but utility-meter data comes from the regulated utility via Bayou, and satellite irradiance comes from NASA/NREL. The developer cannot manipulate all three. Disagreement triggers a FLAGGED status and freezes the distribution until reviewed.",
  },
  {
    q: "Is the ITC included?",
    a: "Where applicable, the federal 30% Investment Tax Credit and 5-year MACRS accelerated depreciation flow through to the SPV's tax-equity partner per the deal's structure, and your allocable share is reflected on your K-1. The ITC is sunsetting for projects not commencing construction by end of 2027 — disclosure on legislative risk appears in every offering's documents.",
  },
  {
    q: "What is the legal structure?",
    a: "Reg D 506(c) private placement to verified accredited investors. General solicitation permitted; you must complete accreditation verification (Parallel Markets or VerifyInvestor). Securities counsel reviews every offering before launch.",
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <section className="mx-auto max-w-3xl">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
            Frequently asked
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">
            Questions worth answering.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            What an investor or developer typically asks before — or after — a first conversation.
          </p>

          <Accordion type="single" collapsible className="mt-10">
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

          <p className="mt-10 font-mono text-[0.6rem] text-muted-foreground/70">
            All financial figures, target returns, and tax-treatment descriptions are illustrative and subject to
            securities counsel review. They will be restated, with full risk factors, in each project's offering
            documents at launch. No offering is currently open. Nothing on this page constitutes a securities
            offering or investment advice.
          </p>
        </section>
      </main>
    </div>
  );
}
