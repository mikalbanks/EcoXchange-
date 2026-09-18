import { Header } from "@/components/header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PUBLIC_POSITIONING } from "@/lib/public-positioning";

const FAQS = [
  {
    q: "What is EcoXchange building?",
    a: "EcoXchange is building distributed power infrastructure for data centers. The long-term goal is a data-center-focused virtual power plant that can aggregate flexible load and distributed energy resources into measurable, verifiable, and eventually dispatchable capacity.",
  },
  {
    q: "Is EcoXchange already a virtual power plant?",
    a: "Not yet. The current wedge is Power Flexibility Readiness: quantify flexible MW, DER options, tariff and interconnection constraints, telemetry requirements, and the practical market pathway for a real site. Orchestration comes after the capacity and operating permissions are proven.",
  },
  {
    q: "Who is the best fit today?",
    a: "The strongest fit is a power-constrained AI/HPC, colocation, or data-center development site where grid timing, contracted MW, or infrastructure constraints are affecting deployment or growth and where flexible compute, storage, onsite generation, or other DERs may be relevant.",
  },
  {
    q: "What inputs are needed for a Power Flexibility Readiness review?",
    a: "Typical inputs include planned and contracted MW, utility and tariff, energization schedule, interval load where available, critical versus flexible workloads, existing or planned batteries or generation, backup-power architecture, interconnection status, and operating constraints.",
  },
  {
    q: "What does EcoXchange return?",
    a: "The review is designed to produce an indicative flexible-MW range, critical operating boundaries, DER options, tariff and contracted-capacity implications, key interconnection or market constraints, telemetry requirements, and a recommended next technical or partner action.",
  },
  {
    q: "Can flexible load eliminate a data center's utility charges?",
    a: "Not necessarily. Many large-load tariffs include minimum-billing or contracted-capacity obligations. EcoXchange separates energy savings from capacity obligations and only models value that the applicable tariff and contract can actually change.",
  },
  {
    q: "Does EcoXchange sell electricity?",
    a: "The current public product does not require EcoXchange to be a retail electricity supplier or wholesale seller. Where market participation, demand response, scheduling, or wholesale sales require a regulated role, EcoXchange can work through qualified utilities or market partners while evaluating whether direct authorization is commercially justified.",
  },
  {
    q: "How do renewable projects, batteries, and generation fit?",
    a: "They are potential supply-side resources. EcoXchange can assess their financeability, interconnection context, telemetry, availability, and fit with a specific data-center power need or future aggregated fleet.",
  },
  {
    q: "What happens to EcoXchange's project-finance technology?",
    a: "It remains an enabling layer. The financeability engine can help determine what a storage, generation, or renewable-energy asset can support, how much capital is required, and whether it can be deployed as part of the distributed-power network.",
  },
  {
    q: "What role does verification play?",
    a: "Verification turns claimed capacity into evidence. EcoXchange is building toward source-labeled records for availability, production, response time, duration, and operating performance so data-center customers, asset owners, market partners, and capital providers can rely on the same operating facts.",
  },
];

export default function FaqPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main public-main-narrow">
        <section className="public-hero">
          <p className="public-eyebrow">Frequently asked questions</p>
          <h1 className="public-title">Data-center power flexibility, DERs, and the path to VPP orchestration.</h1>
          <p className="public-copy">{PUBLIC_POSITIONING}</p>
        </section>

        <section className="public-section">
          <div className="public-faq-panel">
            <Accordion type="single" collapsible>
              {FAQS.map((item, i) => (
                <AccordionItem key={item.q} value={`faq-${i}`} className="border-border">
                  <AccordionTrigger className="text-left font-serif text-lg">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <p className="mb-12 font-mono text-[0.6rem] text-muted-foreground/70">
          Informational and decision-support platform. No guarantee of interconnection, energization, dispatch,
          wholesale-market participation, utility savings, or financing is created through this site.
        </p>
      </main>
    </div>
  );
}
