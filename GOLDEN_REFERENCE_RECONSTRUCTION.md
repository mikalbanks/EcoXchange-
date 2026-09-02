# EcoXchange Project Finance Engine — Golden Reference Reconstruction

## 1. Executive Result

**FAIL — FINANCE CORE NOT VALIDATED**

Reason: the Ticket 07 golden suite has been implemented, but the repository's GitHub Actions jobs are still failing before runner allocation and before any test step executes. Ticket 07 is a hard validation gate, so code inspection and independent arithmetic reconstruction are not sufficient to declare PASS.

The reconstruction work completed in this ticket identifies **no apparent blocking methodology discrepancy in the base cash-only finance chain**. The stated 1 MW / 5 MW / 20 MW assumptions reproduce the source's operating economics, DSCR-sized permanent debt, ITC proceeds, DSRA, lender fee, sponsor equity, cash-only IRR and illustrative downside DSCR when the documented reconstruction assumptions below are used.

A material **known SPEC/source tax difference** remains: the source's reported full-tax-appetite results contain tax mechanics that the approved SPEC 02 simplified tax module does not reproduce. This is non-blocking for the cash-only deterministic core but must remain explicit.

## 2. Source Methodology

Principal benchmark: **U.S. Utility-Scale Renewable Project Finance for 1–20 MW**.

The source sizes permanent debt from annual P50 CFADS divided by 1.30x DSCR, discounted at the supplied annual debt rate over the amortization term, then applies the LTC ceiling. It models transferred ITC cash as eligible basis × ITC rate × transfer price, and sponsor initial cash equity as project capex + closing allowance + lender fee + DSRA − permanent debt − ITC sale cash.

No merchant terminal value is included. The downside illustration is 90% of P50 generation and is explicitly not a site-specific lender-grade P90.

## 3. Golden Inputs

Common source-explicit inputs:

- P50 capacity factor: 24.0%
- Annual degradation: 0.50%
- Year-1 PPA: $55/MWh
- PPA escalation: 1.0%
- PPA / project life: 25 years
- Opex escalation: 2.5%
- ITC rate: 30%
- ITC-eligible basis: 95% of project capex
- ITC transfer price: $0.92 per $1.00 credit
- Federal tax rate: 21%
- Bonus depreciation: 100% Year 1
- P50 debt-sizing DSCR: 1.30x
- Illustrative downside: 90% of P50 generation

Size-specific source-explicit inputs:

| Input | 1 MW | 5 MW | 20 MW |
|---|---:|---:|---:|
| Capex | $1,900,000 | $8,000,000 | $29,000,000 |
| Year-1 Opex | $38,000 | $150,000 | $480,000 |
| Debt rate | 7.25% | 6.50% | 5.80% |
| Amortization / maturity | 15 years | 18 years | 20 years |
| Max LTC | 65% | 70% | 70% |

## 4. Inferred Inputs

The following are **golden reconstruction values only** and are not production defaults:

| Input | 1 MW | 5 MW | 20 MW | Provenance |
|---|---:|---:|---:|---|
| Closing costs | $125,000 | $250,000 | $500,000 | RECONSTRUCTION_INFERRED |
| Lender fee rate | 1.25% | 1.25% | 1.25% | SOURCE_DERIVED_FROM_DISPLAYED_FEE |
| ITC transaction costs | $0 | $0 | $0 | SOURCE_DERIVED |
| Other financing uses | $0 | $0 | $0 | RECONSTRUCTION_INFERRED |
| Other permanent sources | $0 | $0 | $0 | RECONSTRUCTION_INFERRED |
| Sponsor tax appetite for source full-tax comparison | 100% | 100% | 100% | SOURCE_DERIVED |

The round closing-cost assumptions are the lower bounds of the source's stated modeling ranges and reconcile closely to the displayed sponsor-equity outputs. They are not fitted per-project to force exact rounded outputs.

## 5. 1 MW Reconstruction

Independent reconstruction using the approved equations gives:

- Year-1 generation: **2,102.4 MWh**
- Year-1 revenue: **$115,632**
- Year-1 CFADS: **$77,632**
- DSCR-sized / permanent debt: approximately **$517,036.52**
- LTC limit: **$1,235,000**
- Binding constraint: **DSCR**
- ITC eligible basis: **$1,805,000**
- ITC face value: **$541,500**
- ITC sale proceeds: **$498,180**
- Year-1 scheduled debt service: approximately **$59,716.92**
- DSRA at six months: approximately **$29,858.46**
- Lender fee at 1.25%: approximately **$6,462.96**
- Sponsor cash equity using $125,000 closing costs: approximately **$1,046,104.89**
- Cash-only sponsor IRR: approximately **-0.790%**
- Illustrative 90%-of-P50 minimum DSCR: approximately **1.071x**

These align to the source's displayed $517K debt, $498K ITC cash, $29.9K DSRA, $6.5K fee, $1.046M equity, -0.8% cash IRR and 1.07x downside DSCR within displayed precision/tolerance.

## 6. 5 MW Reconstruction

The 5 MW calculation chain is:

5 MW × 8,760 × 24% = **10,512 MWh**

10,512 MWh × $55/MWh = **$578,160 revenue**

$578,160 − $150,000 = **$428,160 CFADS**

$428,160 ÷ 1.30 = **$329,353.846154 Year-1 allowable debt service**

Present value of the annual allowable-debt-service stream at 6.50% over 18 years = approximately **$3,364,160.17**

LTC ceiling = $8,000,000 × 70% = **$5,600,000**

Permanent debt = **$3,364,160.17**, DSCR constrained.

ITC eligible basis = $8,000,000 × 95% = **$7,600,000**

ITC face = $7,600,000 × 30% = **$2,280,000**

ITC sale proceeds = $2,280,000 × 92% = **$2,097,600**

DSRA = $329,353.846154 × 6 / 12 = approximately **$164,676.92**

Lender fee = $3,364,160.17 × 1.25% = approximately **$42,052.00**

Total uses with reconstructed $250,000 closing allowance = approximately **$8,456,728.93**

Sponsor equity = total uses − permanent debt − ITC proceeds = approximately **$2,994,968.75**

Cash-only sponsor IRR = approximately **2.443%**

Illustrative 90%-of-P50 minimum DSCR = approximately **1.096x**

These align to the source's displayed $3.364M debt, $164.7K DSRA, $42.1K fee, $2.995M sponsor equity, 2.4% cash IRR and 1.10x illustrative downside DSCR.

## 7. 20 MW Reconstruction

Independent reconstruction gives:

- Year-1 generation: **42,048 MWh**
- Year-1 revenue: **$2,312,640**
- Year-1 CFADS: **$1,832,640**
- DSCR-sized / permanent debt: approximately **$16,295,989.64**
- LTC limit: **$20,300,000**
- Binding constraint: **DSCR**
- ITC eligible basis: **$27,550,000**
- ITC face: **$8,265,000**
- ITC sale proceeds: **$7,603,800**
- Year-1 debt service: approximately **$1,409,723.08**
- DSRA: approximately **$704,861.54**
- Lender fee: approximately **$203,699.87**
- Sponsor cash equity using $500,000 closing costs: approximately **$6,508,771.77**
- Cash-only sponsor IRR: approximately **6.727%**
- Illustrative 90%-of-P50 minimum DSCR: approximately **1.114x**

These align to the source's displayed $16.296M debt, $7.604M ITC cash, $704.9K DSRA, $203.7K fee, $6.509M sponsor equity, 6.7% cash IRR and 1.11x downside DSCR.

## 8. Debt Reconciliation

The golden suite requires, for all three cases:

- binding constraint = DSCR;
- final fully amortizing debt balance ≤ $1;
- opening permanent debt − total principal − ending balance within $1;
- no negative principal;
- debt amount within the 0.25% source tolerance.

No debt formula change was made during Ticket 07.

## 9. Sources & Uses Reconciliation

The reconstructed closing allowances $125K / $250K / $500K produce sponsor equity approximately:

| Case | Source sponsor equity | Reconstructed sponsor equity | Approx. difference |
|---|---:|---:|---:|
| 1 MW | $1,046,000 | $1,046,104.89 | +$104.89 |
| 5 MW | $2,995,000 | $2,994,968.75 | -$31.25 |
| 20 MW | $6,509,000 | $6,508,771.77 | -$228.23 |

All are within the source's displayed rounding and the 0.25% sponsor-equity tolerance.

## 10. Return Reconciliation

Cash-only sponsor IRR reconstructs closely:

| Case | Source | Independent reconstruction | Status before executable TS suite |
|---|---:|---:|---|
| 1 MW | -0.8% | about -0.790% | arithmetic aligns |
| 5 MW | 2.4% | about 2.443% | arithmetic aligns |
| 20 MW | 6.7% | about 6.727% | arithmetic aligns |

### Known tax-model difference

The approved SPEC 02 simplified tax module calculates:

`DepreciableBasis = ITCEligibleBasis - 0.5 × ITCFace`

That produces immediate federal tax shields of approximately:

- 1 MW: **$322,192.50**
- 5 MW: **$1,356,600.00**
- 20 MW: **$4,917,675.00**

The source displays approximately $342K / $1.441M / $5.222M. Those source values are consistent with using **project capex**, rather than 95% ITC-eligible basis, before subtracting one-half of the ITC face value. In addition, inserting only the immediate tax shield into Year 1 produces after-tax IRRs materially above the source's -0.7% / 3.2% / 12.5%, demonstrating that the source return table contains additional annual tax effects beyond Ticket 06's simplified module.

Classification: **KNOWN_SPEC_DIFFERENCE / NON-BLOCKING SOURCE-MODEL DIFFERENCE**. Ticket 07 does not rewrite the approved simplified tax formula to fit the source.

## 11. Downside Validation

Golden downside inputs are an illustrative 90%-of-P50 multiplier. The golden suite requires:

- `ILLUSTRATIVE_DOWNSIDE_NOT_P90` warning;
- downside generation = 90% of base generation;
- base Opex unchanged;
- downside DSCR uses the original base debt service;
- no debt resizing;
- cash sweep applies downside CFADS to interest first, then principal;
- repayment year remains `NOT_SOURCE_BENCHMARKED` because the report provides methodology but no exact repayment-year table.

## 12. Sensitivity Validation

The source's published PPA, rate and ITC grids are full-tax-appetite IRR grids. Because the V0 simplified tax module is intentionally not identical to the source tax model, exact source-grid IRR matching is classified as a known SPEC/source difference rather than a reason to distort production formulas.

The Ticket 07 suite instead makes the source-supported structural invariants blocking:

- PPA changes must resize debt and rerun the full stack.
- Interest-rate changes must resize debt and rerun the full stack.
- ITC-rate changes must not alter senior debt when operating/debt assumptions are unchanged.
- Capex changes alter LTC, ITC basis and sponsor equity without changing generation/revenue/CFADS.
- Capacity-factor changes alter generation, revenue, CFADS, debt and returns.
- The base fixture must remain immutable.

Exact published full-tax sensitivity-table reconciliation remains conditional on a future approved expansion of the tax model.

## 13. Remaining Differences

1. **Executable validation unavailable — BLOCKING RELEASE GATE.** GitHub Actions is failing before runner allocation/steps, so the repository-standard unit/golden/typecheck/build suite has not executed.
2. **Source full-tax model vs SPEC 02 simplified tax model — NON-BLOCKING SOURCE/SPEC DIFFERENCE.** Cash-only finance remains the authoritative blocking core.
3. The report does not expose an exact cash-sweep repayment-year benchmark. Mechanics are validated; repayment year is not source-benchmarked.

## 14. Formula Changes Made

**None.**

Ticket 07 did not change production finance formulas. It added reconstruction fixtures, tolerance logic, golden comparisons, sensitivity invariants, provenance checks, trace checks and determinism tests.

## 15. Final Validation Decision

**FAIL — FINANCE CORE NOT VALIDATED** until the Ticket 07 test gate actually executes successfully.

Pre-execution financial reconstruction indicates that the blocking cash-only model is consistent with the source across 1 MW, 5 MW and 20 MW. The appropriate eventual success state, if the executable golden suite confirms these results, is expected to be:

**PASS WITH DOCUMENTED NON-BLOCKING SOURCE DIFFERENCES**

because the approved simplified tax module does not reproduce the source's richer full-tax treatment.

### Final validation matrix — pre-execution status

| Area | 1 MW | 5 MW | 20 MW |
|---|---|---|---|
| Operating economics | PENDING EXECUTION | PENDING EXECUTION | PENDING EXECUTION |
| Debt sizing | PENDING EXECUTION | PENDING EXECUTION | PENDING EXECUTION |
| Debt schedule | PENDING EXECUTION | PENDING EXECUTION | PENDING EXECUTION |
| ITC | PENDING EXECUTION | PENDING EXECUTION | PENDING EXECUTION |
| DSRA / fees | PENDING EXECUTION | PENDING EXECUTION | PENDING EXECUTION |
| Sponsor equity | PENDING EXECUTION | PENDING EXECUTION | PENDING EXECUTION |
| Cash IRR | PENDING EXECUTION | PENDING EXECUTION | PENDING EXECUTION |
| Tax-value IRR | KNOWN SPEC DIFFERENCE | KNOWN SPEC DIFFERENCE | KNOWN SPEC DIFFERENCE |
| Downside | PENDING EXECUTION | PENDING EXECUTION | PENDING EXECUTION |
| PPA sensitivity mechanics | PENDING EXECUTION | PENDING EXECUTION | PENDING EXECUTION |
| Rate sensitivity mechanics | PENDING EXECUTION | PENDING EXECUTION | PENDING EXECUTION |
| ITC sensitivity mechanics | PENDING EXECUTION | PENDING EXECUTION | PENDING EXECUTION |

Database, policy, API, frontend and AI implementation remain blocked until this gate executes and passes.
