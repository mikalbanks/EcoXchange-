import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  hashFinanceInput,
  resolveScenarioInput,
  type ResolverFact,
  type ResolverPolicyValue,
  type ResolverScenarioAssumption,
} from "./scenario-resolver";

const policy = { id: "11111111-1111-4111-8111-111111111111", policy_code: "ECOXCHANGE_SOLAR_BASE", policy_version: "0.1.0", status: "ACTIVE" as const };

function pv(id: string, field_key: string, value: unknown, applicability?: ResolverPolicyValue["applicability"]): ResolverPolicyValue {
  return { id, field_key, value, value_classification: "CALCULATION_DEFAULT", applicability };
}

function policyValues(): ResolverPolicyValue[] {
  return [
    pv("p1", "target_p50_dscr", 1.30), pv("p2", "dsra_months", 6), pv("p3", "lender_fee_rate", 0.0125), pv("p4", "itc_rate", 0.30), pv("p5", "itc_transfer_price", 0.92), pv("p6", "dsra_reference_method", "YEAR_ONE"),
    pv("ltc1", "max_ltc", 0.65, { capacity_mw_ac: { gte: 1, lt: 3 } }), pv("ltc2", "max_ltc", 0.70, { capacity_mw_ac: { gte: 3, lte: 20 } }),
    pv("r1", "debt_interest_rate_default", 0.0725, { capacity_mw_ac: { gte: 1, lt: 3 } }), pv("r2", "debt_interest_rate_default", 0.065, { capacity_mw_ac: { gte: 3, lt: 10 } }), pv("r3", "debt_interest_rate_default", 0.058, { capacity_mw_ac: { gte: 10, lte: 20 } }),
    pv("a1", "amortization_years_default", 15, { capacity_mw_ac: { gte: 1, lt: 3 } }), pv("a2", "amortization_years_default", 18, { capacity_mw_ac: { gte: 3, lt: 10 } }), pv("a3", "amortization_years_default", 20, { capacity_mw_ac: { gte: 10, lte: 20 } }),
    pv("m1", "debt_maturity_years_default", 15, { capacity_mw_ac: { gte: 1, lt: 3 } }), pv("m2", "debt_maturity_years_default", 18, { capacity_mw_ac: { gte: 3, lt: 10 } }), pv("m3", "debt_maturity_years_default", 20, { capacity_mw_ac: { gte: 10, lte: 20 } }),
  ];
}

function fact(id: string, field_key: string, value: unknown, unit?: string, verified = true): ResolverFact {
  return { id, field_key, value, unit, source_type: verified ? "EXECUTED_DOCUMENT" : "USER_ASSERTION", confidence_status: verified ? "VERIFIED" : "UNVERIFIED", is_current: true };
}

function baseFacts(capacity = 5): ResolverFact[] {
  return [
    fact("capacity", "project.capacity_mw_ac", capacity, "MW_AC"), fact("life", "project.project_life_years", 25, "YEARS"),
    fact("cf", "generation.capacity_factor_p50", 0.24, "PERCENT_DECIMAL"), fact("deg", "generation.annual_degradation_rate", 0.005, "PERCENT_DECIMAL"),
    fact("ppa", "revenue.ppa_price_year_1_per_mwh", 55, "USD_PER_MWH"), fact("ppaesc", "revenue.ppa_escalation_rate", 0.01, "PERCENT_DECIMAL"), fact("ppaterm", "revenue.ppa_term_years", 25, "YEARS"),
    fact("opex", "operating_costs.opex_year_1", capacity === 1 ? 38000 : capacity === 20 ? 480000 : 150000, "USD"), fact("opexesc", "operating_costs.opex_escalation_rate", 0.025, "PERCENT_DECIMAL"),
    fact("basis", "tax_credit.itc_eligible_basis_pct", 0.95, "PERCENT_DECIMAL"), fact("itctxn", "tax_credit.itc_transaction_costs", 0, "USD"),
    fact("capex", "transaction_costs.project_capex", capacity === 1 ? 1900000 : capacity === 20 ? 29000000 : 8000000, "USD"),
    fact("closing", "transaction_costs.closing_costs", capacity === 1 ? 125000 : capacity === 20 ? 500000 : 250000, "USD"), fact("otheruses", "transaction_costs.other_financing_uses", 0, "USD"), fact("othersources", "transaction_costs.other_permanent_sources", 0, "USD"),
    fact("dtype", "downside.downside_type", "ILLUSTRATIVE_MULTIPLIER"), fact("dmult", "downside.downside_generation_multiplier", 0.90, "PERCENT_DECIMAL"), fact("dsource", "downside.generation_source_type", "ILLUSTRATIVE_PERCENT_OF_P50"),
    fact("taxenabled", "calculation_options.tax_module_enabled", false),
  ];
}

function resolve(capacity = 5, assumptions: ResolverScenarioAssumption[] = [], facts = baseFacts(capacity), values = policyValues()) {
  return resolveScenarioInput({ project: { id: "project-1", technology: "SOLAR_PV", capacity_mw_ac: capacity, country_code: "US", state_code: "GA", revenue_structure: "FULLY_CONTRACTED" }, scenario_id: "scenario-1", projectFacts: facts, scenarioAssumptions: assumptions, policy, policyValues: values, policyOverrides: [] });
}

describe("Ticket 10 scenario resolver", () => {
  it.each([[1,0.65,0.0725,15],[2.99,0.65,0.0725,15],[3,0.70,0.065,18],[9.99,0.70,0.065,18],[10,0.70,0.058,20],[20,0.70,0.058,20]])("resolves independent policy applicability bands at %s MW", (capacity, ltc, rate, amort) => {
    const r = resolve(capacity as number);
    expect(r.calculation_ready).toBe(true);
    expect(r.finance_input?.financing.max_ltc).toBe(ltc);
    expect(r.finance_input?.financing.annual_interest_rate).toBe(rate);
    expect(r.finance_input?.financing.amortization_years).toBe(amort);
  });

  it("lets an explicit scenario assumption override a verified fact", () => {
    const r = resolve(5, [{ id: "scenario-ppa", field_key: "revenue.ppa_price_year_1_per_mwh", value: 50, unit: "USD_PER_MWH" }]);
    expect(r.finance_input?.revenue.ppa_price_year_1_per_mwh).toBe(50);
    expect(r.resolved_fields["revenue.ppa_price_year_1_per_mwh"].resolution_source).toBe("SCENARIO_ASSUMPTION");
    expect(r.warnings.some((w) => w.code === "SCENARIO_ASSUMPTION_OVERRIDES_VERIFIED_FACT")).toBe(true);
  });

  it("uses an unverified user fact without pretending it is verified", () => {
    const facts = baseFacts(5).filter((f) => f.field_key !== "transaction_costs.project_capex");
    facts.push(fact("capex-user", "transaction_costs.project_capex", 8000000, "USD", false));
    const r = resolve(5, [], facts);
    expect(r.calculation_ready).toBe(true);
    expect(r.resolved_fields["transaction_costs.project_capex"].resolution_source).toBe("USER_ASSERTION");
    expect(r.warnings.some((w) => w.code === "USER_ASSERTION_USED")).toBe(true);
  });

  it("does not silently use a disputed project fact", () => {
    const facts = baseFacts(5).map((f) => f.field_key === "transaction_costs.project_capex" ? { ...f, confidence_status: "DISPUTED" as const } : f);
    const r = resolve(5, [], facts);
    expect(r.calculation_ready).toBe(false);
    expect(r.missing_fields.some((m) => m.field_key === "transaction_costs.project_capex" && m.reason === "DISPUTED_FACT_NOT_AUTO_USED")).toBe(true);
  });

  it("rejects unregistered policy-controlled scenario changes", () => {
    const r = resolve(5, [{ id: "bad-dscr", field_key: "financing.target_dscr", value: 1.25, unit: "RATIO" }]);
    expect(r.calculation_ready).toBe(false);
    expect(r.errors.some((e) => e.code === "UNREGISTERED_POLICY_OVERRIDE")).toBe(true);
  });

  it("applies a registered policy override and preserves the original policy value", () => {
    const r = resolveScenarioInput({ project: { id: "project-1", technology: "SOLAR_PV", capacity_mw_ac: 5, country_code: "US", revenue_structure: "FULLY_CONTRACTED" }, scenario_id: "scenario-1", projectFacts: baseFacts(5), scenarioAssumptions: [], policy, policyValues: policyValues(), policyOverrides: [{ id: "ov1", field_key: "financing.target_dscr", policy_id: policy.id, policy_version: policy.policy_version, policy_value: 1.30, override_value: 1.25, reason: "Lender term sheet", created_by: "user-1", created_at: "2026-09-03T12:00:00Z" }] });
    expect(r.calculation_ready).toBe(true);
    expect(r.finance_input?.financing.target_dscr).toBe(1.25);
    expect(r.resolved_fields["financing.target_dscr"]).toMatchObject({ resolution_source: "POLICY_OVERRIDE", policy_value: 1.30, override_used: true, override_reason: "Lender term sheet" });
  });

  it("detects stale and overlapping policy configuration", () => {
    const stale = resolveScenarioInput({ project: { id: "p", technology: "SOLAR_PV", capacity_mw_ac: 5, revenue_structure: "FULLY_CONTRACTED" }, scenario_id: "s", projectFacts: baseFacts(5), scenarioAssumptions: [], policy, policyValues: policyValues(), policyOverrides: [{ id: "ov", field_key: "financing.target_dscr", policy_id: policy.id, policy_version: policy.policy_version, policy_value: 1.35, override_value: 1.25, reason: "Old quote", created_by: "u", created_at: "2026-09-03T00:00:00Z" }] });
    expect(stale.errors.some((e) => e.code === "STALE_POLICY_OVERRIDE")).toBe(true);
    const overlap = resolve(5, [], baseFacts(5), [...policyValues(), pv("overlap", "max_ltc", 0.68, { capacity_mw_ac: { gte: 3, lte: 10 } })]);
    expect(overlap.errors.some((e) => e.code === "POLICY_CONFIGURATION_ERROR" && e.field_key === "financing.max_ltc")).toBe(true);
  });

  it("returns missing required inputs structurally instead of inventing them", () => {
    const r = resolve(5, [], baseFacts(5).filter((f) => f.field_key !== "transaction_costs.project_capex"));
    expect(r.calculation_ready).toBe(false);
    expect(r.missing_fields.some((m) => m.field_key === "transaction_costs.project_capex")).toBe(true);
  });

  it("blocks unsupported technology and merchant revenue before finance execution", () => {
    const merchant = resolveScenarioInput({ project: { id: "p", technology: "SOLAR_PV", capacity_mw_ac: 5, revenue_structure: "MERCHANT" }, scenario_id: "s", projectFacts: baseFacts(5), scenarioAssumptions: [], policy, policyValues: policyValues(), policyOverrides: [] });
    expect(merchant.errors.some((e) => e.code === "OUT_OF_SCOPE_FOR_CALCULATION")).toBe(true);
    const battery = resolveScenarioInput({ project: { id: "p", technology: "BATTERY_STORAGE", capacity_mw_ac: 5, revenue_structure: "FULLY_CONTRACTED" }, scenario_id: "s", projectFacts: baseFacts(5), scenarioAssumptions: [], policy, policyValues: policyValues(), policyOverrides: [] });
    expect(battery.errors.some((e) => e.code === "OUT_OF_SCOPE_FOR_CALCULATION")).toBe(true);
  });

  it("produces the expected 1 MW, 5 MW, and 20 MW golden finance inputs", () => {
    for (const capacity of [1,5,20]) {
      const r = resolve(capacity);
      expect(r.calculation_ready).toBe(true);
      expect(r.finance_input?.project.capacity_mw_ac).toBe(capacity);
      expect(r.finance_input?.generation.capacity_factor_p50).toBe(0.24);
      expect(r.finance_input?.revenue.ppa_price_year_1_per_mwh).toBe(55);
      expect(r.finance_input?.financing.target_dscr).toBe(1.30);
      expect(r.finance_input?.tax_credit.itc_rate).toBe(0.30);
    }
  });

  it("hashes canonical math inputs independent of object insertion order and provenance", () => {
    const a = resolve(5), b = resolve(5, [{ id: "same-ppa", field_key: "revenue.ppa_price_year_1_per_mwh", value: 55, unit: "USD_PER_MWH" }]);
    expect(a.input_hash).toBe(b.input_hash);
    expect(a.resolved_fields["revenue.ppa_price_year_1_per_mwh"].resolution_source).not.toBe(b.resolved_fields["revenue.ppa_price_year_1_per_mwh"].resolution_source);
    expect(canonicalJson({ z: 1, a: { y: 2, x: 3 } })).toBe(canonicalJson({ a: { x: 3, y: 2 }, z: 1 }));
    expect(hashFinanceInput(JSON.parse(JSON.stringify(a.finance_input)))).toBe(a.input_hash);
  });

  it("is deterministic across input query ordering and does not mutate inputs", () => {
    const facts = baseFacts(5), values = policyValues();
    const factsBefore = JSON.stringify(facts), valuesBefore = JSON.stringify(values);
    const a = resolve(5, [], facts, values);
    const b = resolve(5, [], [...facts].reverse(), [...values].reverse());
    expect(a.input_hash).toBe(b.input_hash);
    expect(a.finance_input).toEqual(b.finance_input);
    expect(a.missing_fields).toEqual(b.missing_fields);
    expect(JSON.stringify(facts)).toBe(factsBefore);
    expect(JSON.stringify(values)).toBe(valuesBefore);
  });

  it("round-trips the immutable snapshot without changing finance input or hash", () => {
    const r = resolve(5);
    const parsed = JSON.parse(JSON.stringify(r.input_snapshot));
    expect(parsed.finance_input).toEqual(r.finance_input);
    expect(hashFinanceInput(parsed.finance_input)).toBe(r.input_hash);
    expect(parsed.policy_context.policy_version).toBe("0.1.0");
    expect(parsed.resolution.resolver_version).toBe("0.1.0");
  });
});
