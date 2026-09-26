export const pageMeta = {
  "/": ["EcoXchange — A faster path to data-center power", "EcoXchange coordinates DERs and deployment partners to pursue earlier power pathways for qualified data-center sites facing grid delays."],
  "/data-centers": ["Data Centers — EcoXchange", "Explore DER-enabled power pathways for data centers facing interconnection queues and grid upgrades."],
  "/partners": ["DER & Project Partners — EcoXchange", "Align storage, generation, and deployment capabilities with qualified data-center power needs."],
  "/platform": ["How It Works — EcoXchange", "See how EcoXchange coordinates site requirements, DER options, partners, and operating evidence toward deployment."],
  "/financeability": ["DER Deployment & Financing — EcoXchange", "Coordinate financing when capital is required to get screened distributed-energy capacity into service."],
  "/pilot": ["90-Day DER Pilot — EcoXchange", "Validate telemetry, control logic, operating fit, and expansion economics on a baseline 2 MW scope."],
  "/case-studies": ["Field Patterns — EcoXchange", "Illustrative data-center power-gap patterns and the readiness work they require."],
  "/insights": ["Insights — EcoXchange", "Perspectives on data-center power timelines, distributed energy resources, and deployment requirements."],
  "/about": ["About — EcoXchange", "EcoXchange coordinates DER-enabled power pathways for data-center projects."],
  "/faq": ["FAQ — EcoXchange", "Answers about DER-enabled power pathways, project fit, utility requirements, and EcoXchange's current role."],
  "/assessment": ["Explore Your Power Path — EcoXchange", "Share site details so EcoXchange can determine fit and next steps for a DER-enabled power pathway."],
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
    title: "Power timelines need another path.",
    summary: "When a queue or grid upgrade puts growth on hold, suitable onsite resources may support an earlier power phase. EcoXchange coordinates the DER and delivery pathway around your site's real requirements.",
    image: "/assets/ecoxchange-campus-aerial.webp",
    action: ["Explore your power path", "/assessment"],
    stats: [["Required firm load", "MW needed at the customer ramp milestone"], ["Effective firm supply", "Capacity physically available by that same date"], ["Bridge requirement", "The remaining MW/time shortfall to solve"]],
    sections: [["Define the ramp", "Map required MW by phase, first occupancy, later expansion milestones, critical load, flexible load, and the reliability standard."], ["Count only firm supply", "Separate physically available utility and onsite capacity from requested, queued, studied, or announced MW."], ["Convert MW into a duty profile", "Define when the shortfall begins, how long it lasts, hours per day, response time, redundancy, recharge or fuel needs, and the exit date."], ["Engineer the bridge", "Match the duty profile with dependable generation, storage, flexible demand, and distributed renewables without double-counting capacity."]]
  },
  "/partners": {
    eyebrow: "For DER, generation, storage, controls, and project partners",
    title: "Put distributed resources to work where power is needed.",
    summary: "EcoXchange coordinates qualified DER opportunities with data-center power needs, bringing resource and deployment partners into a site-specific delivery pathway.",
    image: "/assets/ecoxchange-switchgear-hero.webp",
    action: ["Discuss a DER resource", "/contact"],
    stats: [["Effective firm MW", "What the resource can actually deliver in the constrained interval"], ["Contractable capacity", "Clear commercial and dispatch rights"], ["Integrable resource", "Telemetry, controls, interconnection, and operating fit"]],
    sections: [["Anchor resource first", "For material gaps, prioritize one or a small number of large, controllable resources before mass-origination of smaller DERs."], ["Prove the operating fit", "Show usable MW and MWh, response time, fuel or recharge needs, derates, maintenance exposure, and redundancy."], ["Define rights and interfaces", "Make ownership, dispatch authority, export limits, interconnection, telemetry, cybersecurity, and market-access responsibilities explicit."], ["Coordinate deployment", "Bring integration and financing partners into the workflow when they are required to get qualified capacity into service."]]
  },
  "/platform": {
    eyebrow: "The EcoXchange operating model",
    title: "Coordinate DERs into a practical path to power.",
    summary: "EcoXchange connects site needs, distributed resources, deployment partners, and operating evidence so qualified projects can move toward an earlier power phase where feasible. Portfolio orchestration is a future aim.",
    image: "/assets/ecoxchange-switchgear-hero.webp",
    action: ["Explore your power path", "/assessment"],
    stats: [["MW/time gap", "Required load minus effective firm supply"], ["DER stack", "Generation, storage, flexible demand, and distributed renewables"], ["Evidence layer", "Telemetry, availability, response, duration, and verified value"]],
    sections: [["Site and grid diligence", "Confirm required MW, secured utility MW, power-arrival date, ramp date, gap duration, load shape, reliability, site constraints, and economics."], ["DER pathway design", "Evaluate whether storage, generation, flexible demand, or other resources can support an earlier phase without treating nameplate capacity as firm supply."], ["Partner assembly", "Coordinate technology, integration, utility, market-access, and capital partners where the proposed pathway needs them."], ["Pilot and verification", "Where a bounded engagement is agreed, validate telemetry, control logic, operating fit, and the expansion case before broader deployment."], ["Future orchestration", "EcoXchange aims to develop and own DER assets and coordinate qualified fleets at scale when the capabilities, partners, and permissions exist."]]
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
  { type: "Field note", title: "When the grid timeline and the compute timeline diverge", excerpt: "Interconnection queues and grid upgrades can delay a campus. A site-specific DER pathway may create another sequence for power delivery." },
  { type: "Perspective", title: "What DERs can—and cannot—solve", excerpt: "Storage and onsite generation need the right site, utility treatment, approvals, economics, and operating plan. They are not a universal queue bypass." },
  { type: "Technical brief", title: "Why MW without MWh is incomplete", excerpt: "Storage sizing starts with power, duration, recharge, state-of-charge reserve, efficiency, and the actual duty cycle—not nameplate MW alone." },
  { type: "Operating note", title: "Anchor resources before mass aggregation", excerpt: "Large, controllable, nearby, contractable resources can carry the backbone of a bridge while smaller DERs fill remaining gaps." },
  { type: "Perspective", title: "Readiness before orchestration", excerpt: "Telemetry, rights, interconnection, utility rules, and verified performance come before credible portfolio dispatch." },
];

export const faqs = [
  ["What does EcoXchange do today?", "EcoXchange qualifies data-center power opportunities and coordinates DER resources and deployment partners. We bring site needs, utility requirements, technical constraints, and operating evidence into a practical pathway."],
  ["Can DERs avoid an interconnection queue or grid upgrade?", "Sometimes DERs can support an earlier or phased power strategy, but they do not universally bypass queues or eliminate upgrades. The answer depends on the site, utility rules, permitting, interconnection, technical fit, approvals, and economics."],
  ["Does EcoXchange develop or own DER assets?", "Not as a current general offering. EcoXchange aims to develop and own DER assets in the future; today it coordinates qualified resources and delivery partners."],
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
