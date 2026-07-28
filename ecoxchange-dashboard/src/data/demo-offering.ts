// Canonical demo offering economics — the single source of truth for every
// number the demo renders about Savannah Solar I: offering size, token supply,
// the demo investor's position, and the distribution amounts.
//
// Before this module the demo carried two contradictory worlds:
//
//   A. "Portfolio canon" — $50,000 position, 2.0% ownership, a $17,700/month
//      pool paying $354/month, $4,248 lifetime, an 8.5% cash yield.
//   B. "Distribution canon" — 100 ESN, $10,000 cost basis, $58.33/month.
//
// Both rendered in the same demo, on the same pages. The conflict came from
// conflating "2.0% ownership" (which is $50,000 of a $2,500,000 raise) with
// "100 ESN" (which is $10,000 at $100/token). Both cannot describe one
// investor. World B is the defensible one: it matches the $10,000 minimum in
// demo-offering.json, and 8.5% sits outside the 6–8% target cash-yield band
// the platform advertises.
//
// Resolution, all derived from demo-offering.json:
//   - 25,000 ESN x $100 = $2,500,000 raise             (offering, unchanged)
//   - 7.0% target annual cash yield                     (offering, unchanged)
//   - $2,500,000 x 7.0% = $175,000/yr = $14,583.33/mo   (offering pool)
//   - demo investor holds 100 ESN = $10,000 = 0.4%      (matches the minimum)
//   - 0.4% x $14,583.33 = $58.33/month = $700/year      (investor position)
//
// Anything rendering a dollar amount, token count, or ownership percentage for
// this offering must derive it from here rather than hard-coding a literal.
import demoOfferingJson from "./demo-offering.json";

const json = demoOfferingJson as {
  offering_name: string;
  project_id: string;
  target_raise: number;
  minimum_investment: number;
  token_price: number;
  total_tokens: number;
  target_annual_yield: number;
  project: { latitude: number; longitude: number; capacity_kw_dc: number };
};

/** Tokens held by the demo investor persona ("Your Wallet"). */
const DEMO_INVESTOR_TOKENS = 100;

/** Months of distribution history in demo-distributions.json. */
const DISTRIBUTION_MONTHS = 12;

const tokenPrice = json.token_price;
const totalTokens = json.total_tokens;
const targetYield = json.target_annual_yield;

const positionValue = DEMO_INVESTOR_TOKENS * tokenPrice;
const monthlyDistribution = round2((positionValue * targetYield) / 12);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const DEMO_OFFERING = {
  offering_name: json.offering_name,
  project_id: json.project_id,
  capacity_kw_dc: json.project.capacity_kw_dc,
  location: {
    lat: json.project.latitude,
    lng: json.project.longitude,
    state: "GA",
    city: "Savannah",
  },

  // ── Offering terms ─────────────────────────────────────────────────────
  total_tokens: totalTokens, // 25,000 ESN
  token_price_usd: tokenPrice, // $100
  total_raise_usd: json.target_raise, // $2,500,000
  minimum_investment_usd: json.minimum_investment, // $10,000
  target_annual_yield_pct: round2(targetYield * 100), // 7.0

  // ── The demo investor's position ───────────────────────────────────────
  demo_investor: {
    tokens_held: DEMO_INVESTOR_TOKENS, // 100 ESN
    position_value_usd: positionValue, // $10,000 — the stated minimum
    ownership_pct: round2((DEMO_INVESTOR_TOKENS / totalTokens) * 100), // 0.4
    ownership_bps: Math.round((DEMO_INVESTOR_TOKENS / totalTokens) * 10_000), // 40
    target_annual_yield_pct: round2(targetYield * 100), // 7.0
    monthly_distribution_usd: monthlyDistribution, // $58.33
    annual_distribution_usd: round2(positionValue * targetYield), // $700.00
    // What the demo investor has actually been paid: 12 monthly payments of
    // $58.33. Four cents below annual_distribution_usd because each payment is
    // rounded to the cent — the ledger, not the target.
    lifetime_distributions_usd: round2(monthlyDistribution * DISTRIBUTION_MONTHS), // $699.96
  },

  // ── Offering-level distributions (all holders combined) ────────────────
  offering_distributions: {
    monthly_total_usd: round2((json.target_raise * targetYield) / 12), // $14,583.33
    annual_total_usd: round2(json.target_raise * targetYield), // $175,000.00
  },
} as const;

export type DemoOffering = typeof DEMO_OFFERING;
