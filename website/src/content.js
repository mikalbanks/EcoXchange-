export const pageMeta = {
  "/": ["EcoXchange — Distributed Power Infrastructure for Data Centers", "Identify the real MW/time power gap, match dependable distributed energy, and build toward orchestrated virtual capacity."],
  "/data-centers": ["Data-Center Power Gaps — EcoXchange", "Quantify required firm MW, effective firm supply, ramp dates, and the resulting bridge requirement."],
  "/partners": ["DER Partners — EcoXchange", "Bring dependable, contractable generation, storage, flexible load, and distributed renewables to real data-center power gaps."],
  "/platform": ["Platform — EcoXchange", "From power-gap discovery and technical audit through DER matching, pilot, and commercial orchestration."],
  "/financeability": ["DER Deployment & Financing — EcoXchange", "Coordinate financing when capital is required to get screened distributed-energy capacity into service."],
  "/pilot": ["90-Day DER Pilot — EcoXchange", "Validate telemetry, control logic, operating fit, and expansion economics on a baseline 2 MW scope."],
  "/case-studies": ["Field Patterns — EcoXchange", "Illustrative data-center power-gap patterns and the readiness work they require."],
  "/insights": ["Insights — EcoXchange", "Clear thinking on data-center power gaps, distributed resources, telemetry, and orchestration."],
  "/about": ["About — EcoXchange", "EcoXchange is building distributed power infrastructure for data centers."],
  "/faq": ["FAQ — EcoXchange", "Answers about power gaps, dependable DER capacity, pilots, financing, and market participation."],
  "/assessment": ["Power-Gap Assessment — EcoXchange", "Share the MW, timing, utility, and site constraints that define a real data-center power gap."],
  "/contact": ["Contact — EcoXchange", "Discuss a data-center power gap, distributed-energy asset, or deployment partnership."],
};

export const legacyRoutes = {
  "/market": "/platform", "/develop": "/partners", "/verification": "/platform",
  "/method": "/platform", "/bankability": "/financeability", "/invest": "/financeability",
  "/power-flexibility": "/data-centers",
};

export const pageContent = {
  "/data-centers": {
    eyebrow: "For data-center operators and developers",
    title: "Find the MW/time gap before it blocks your ramp.",
    summary: "EcoXchange compares the firm load you need at each ramp milestone with the power that will actually be available by that same date, then evaluates distributed-energy options that can bridge or reduce the shortfall.",
    image: "/assets/ecoxchange-campus-aerial.webp",
    action: ["Assess your power gap", "/assessment"],
    stats: [["Required firm load", "MW needed at the customer ramp milestone"], ["Effective firm supply", "Capacity physically available by that same date"], ["Bridge requirement", "The remaining MW/time shortfall to solve"]],
    sections: [["Define the ramp", "Map required MW by phase, first occupancy, later expansion milestones, critical load, flexible load, and the reliability standard."], ["Count only firm supply", "Separate physically available utility and onsite capacity from requested, queued, studied, or announced MW."], ["Convert MW into a duty profile", "Define when the shortfall begins, how long it lasts, hours per day, response time, redundancy, recharge or fuel needs, and the exit date."], ["Engineer the bridge", "Match the duty profile with dependable generation, storage, flexible demand, and distributed renewables without double-counting capacity."]]
  },
  "/partners": {
    eyebrow: "For DER, generation, storage, controls, and project partners",
    title: "Bring dependable capacity to real data-center power gaps.",
    summary: "EcoXchange builds demand around verified enterprise MW/time constraints and needs large, controllable, contractable resources that can be integrated into credible customer solutions.",
    image: "/assets/ecoxchange-switchgear-hero.webp",
    action: ["Discuss a DER resource", "/contact"],
    stats: [["Effective firm MW", "What the resource can actually deliver in the constrained interval"], ["Contractable capacity", "Clear commercial and dispatch rights"], ["Integrable resource", "Telemetry, controls, interconnection, and operating fit"]],
    sections: [["Anchor resource first", "For material gaps, prioritize one or a small number of large, controllable resources before mass-origination of smaller DERs."], ["Prove the operating fit", "Show usable MW and MWh, response time, fuel or recharge needs, derates, maintenance exposure, and redundancy."], ["Define rights and interfaces", "Make ownership, dispatch authority, export limits, interconnection, telemetry, cybersecurity, and market-access responsibilities explicit."], ["Coordinate deployment", "Bring integration and financing partners into the workflow when they are required to get qualified capacity into service."]]
  },
  "/platform": {
    eyebrow: "The EcoXchange operating model",
    title: "From power gap to orchestrated distributed capacity.",
    summary: "The platform turns a grid-constrained data-center load into a screened DER portfolio, then preserves the telemetry and evidence needed to operate, verify, expand, and eventually orchestrate that capacity.",
    image: "/assets/ecoxchange-switchgear-hero.webp",
    action: ["Start a power-gap assessment", "/assessment"],
    stats: [["MW/time gap", "Required load minus effective firm supply"], ["DER stack", "Generation, storage, flexible demand, and distributed renewables"], ["Evidence layer", "Telemetry, availability, response, duration, and verified value"]],
    sections: [["Power-Gap Discovery", "Identify serious data-center projects through utility territories, large-load and interconnection signals, public records, and direct operator intelligence."], ["Technical / Energy Audit", "Confirm required MW, secured utility MW, power-arrival date, ramp date, gap duration, load shape, reliability, site constraints, and economics."], ["Demand-to-Supply Matching", "Engineer a physically credible DER stack using effective firm capacity rather than nameplate capacity."], ["DER Partner and Financing Assembly", "Assign technology, integration, market-access, and capital partners to the proposed stack where required."], ["90-Day DER Pilot", "Validate telemetry, control logic, operating fit, verified value, and the expansion case on a bounded scope."], ["Commercial DER Orchestration", "Expand into larger MW fleets, optimize dispatch and flexible load, measure verified value, and build toward portfolio-level VPP orchestration through appropriate partners."]]
  },
  "/financeability": {
    eyebrow: "DER deployment and capital coordination",
    title: "Use capital to get qualified capacity into service.",
    summary: "Financing is an enabling layer in the deployment workflow. EcoXchange can coordinate capital options when a screened DER solution needs equipment, project, infrastructure, strategic, or customer-funded capital to become deployable.",
    image: "/assets/ecoxchange-campus-aerial.webp",
    action: ["Discuss a deployment", "/contact"],
    stats: [["Physical need first", "Capital follows a defined MW/time requirement"], ["Lawful structure", "Financing roles stay separate from regulated activities"], ["Deployment evidence", "Technical scope, economics, and operating assumptions remain reviewable"]],
    sections: [["Start with the power solution", "Define the customer requirement and technically screened resource stack before turning financing into the product story."], ["Identify the capital requirement", "Separate customer-funded equipment, project capital, infrastructure ownership, strategic capital, and other lawful structures."], ["Coordinate the right partners", "Bring capital providers into the transaction when financing is required to get assets installed and operating."], ["Preserve role boundaries", "EcoXchange does not represent itself as a lender, broker-dealer, securities underwriter, investment adviser, or regulated market operator without the required authorization or partner."]]
  },
  "/pilot": {
    eyebrow: "90-day DER pilot",
    title: "Prove the operating model on 2 MW before scaling the fleet.",
    summary: "The standard paid pilot validates telemetry and data access, establishes a baseline, tests power-gap and optimization logic, integrates relevant DER and controls, measures operating value, and defines the expansion case.",
    image: "/assets/ecoxchange-campus-aerial.webp",
    action: ["Start the assessment", "/assessment"],
    stats: [["90 days", "Standard pilot term"], ["2 MW", "Baseline controlled capacity"], ["$35,000", "Current standard pilot fee"]],
    sections: [["Days 0–30 — Baseline and data readiness", "Normalize load, utility, tariff, DER, telemetry, control, ownership, and operating-boundary data into one baseline and pilot control plan."], ["Days 31–60 — Optimization and controlled testing", "Run the selected strategy in live-control, shadow, simulation, or partner-dispatched mode based on permissions and readiness."], ["Days 61–90 — Verification and rollout", "Reconcile measured versus modeled performance, identify constraints and value, and produce the commercial operating design."], ["Conversion gate", "Expand when the baseline is accepted, the strategy is operationally feasible, economics justify deployment, at least 10 MW is addressable, required partners are available, and the rollout plan is agreed."]]
  },
};

export const insightItems = [
  { type: "Field note", title: "A megawatt is not a power gap", excerpt: "A campus announcement, queue position, or requested utility allocation becomes actionable only after required load and physically available firm MW are compared on the same date." },
  { type: "Technical brief", title: "Why MW without MWh is incomplete", excerpt: "Storage sizing starts with power, duration, recharge, state-of-charge reserve, efficiency, and the actual duty cycle—not nameplate MW alone." },
  { type: "Operating note", title: "Anchor resources before mass aggregation", excerpt: "Large, controllable, nearby, contractable resources can carry the backbone of a bridge while smaller DERs fill remaining gaps." },
  { type: "Perspective", title: "Readiness before orchestration", excerpt: "Telemetry, rights, interconnection, utility rules, and verified performance come before credible portfolio dispatch." },
];

export const faqs = [
  ["What is a data-center power gap?", "It is the MW/time difference between the firm load a site needs at a specific ramp milestone and the effective firm supply physically available by that same date. The gap is incomplete until duration, response, reliability, recharge or fuel, and exit timing are defined."],
  ["What inputs are needed for an assessment?", "Start with required MW, firm utility MW actually secured, power-arrival timing, ramp or occupancy timing, utility status, known load flexibility, onsite resources, reliability requirements, and the primary constraint. Unknowns can be identified during the audit."],
  ["What resources can bridge or reduce a gap?", "Depending on the duty profile, the stack can include dispatchable generation or fuel cells, battery storage, flexible demand, distributed solar or wind with appropriate firming, and other contractable DER. EcoXchange does not treat intermittent nameplate MW as firm capacity by default."],
  ["Is every megawatt of DER counted as firm capacity?", "No. Effective firm MW depends on the actual constrained interval, usable MWh, fuel or recharge, availability, derates, maintenance, redundancy, dispatch rights, and operating restrictions."],
  ["What is the 90-day DER pilot?", "The standard pilot is a paid, bounded operating engagement designed to validate telemetry, establish a baseline, test control or optimization logic, measure value, and determine whether the same architecture can scale into a larger commercial fleet."],
  ["Does EcoXchange finance DER deployments?", "EcoXchange can coordinate financing when capital is required to get a screened DER solution into service. Capital formation is an enabling layer, not the primary customer proposition, and EcoXchange does not claim regulated financing roles it does not hold."],
  ["Does EcoXchange directly participate in wholesale power markets?", "Not by default. Demand response, grid-service registration, bidding, dispatch, and settlement can require an authorized QSE, scheduling coordinator, CSP, aggregator, utility, or other qualified market-access partner depending on jurisdiction."],
  ["Does EcoXchange guarantee power, savings, interconnection, or market revenue?", "No. The platform is decision support and operating infrastructure. Power availability, savings, interconnection, equipment performance, financing, and market revenue depend on customer, utility, technical, contractual, and regulatory conditions."],
  ["Is EcoXchange already a virtual power plant?", "EcoXchange is building toward portfolio-level orchestration. The current sequence is power-gap discovery, technical audit, DER matching, partner and financing assembly, pilot, commercial orchestration, and then VPP or grid-service expansion where legally and operationally eligible."],
];
