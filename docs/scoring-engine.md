# EcoXchange Scoring & Yield Engine

The core computation engine powering EcoXchange's readiness scoring, capital stack analysis, and energy-to-yield pipeline.

Source: `server/scoring-engine.ts`

---

## 1. Readiness Scoring Engine

Evaluates a renewable energy project's readiness for tokenization on a 0–100 scale.

**Inputs:** Project details, uploaded documents, data room checklist, capital stack

**Output:** `{ score, rating, reasons, flags }`

### Scoring Criteria

| Category | Status | Deduction | Guidance |
|---|---|---|---|
| **Site Control** | NONE | -25 | Obtain at minimum a LOI or Option agreement |
| | LOI | -15 | Upgrade to Option or Lease |
| | OPTION | -8 | Consider upgrading to Lease |
| | LEASE | 0 | No deduction |
| **Interconnection** | UNKNOWN | -20 | Submit interconnection application |
| | APPLIED | -15 | Await study results |
| | STUDY | -10 | Work toward IA execution |
| | IA_EXECUTED | -3 | Proceed to construction readiness |
| | COMPLETED | 0 | No deduction |
| **Permitting** | UNKNOWN | -15 | Begin permitting process |
| | IN_PROGRESS | -10 | Complete and submit permit applications |
| | SUBMITTED | -5 | Await approval |
| | APPROVED | 0 | No deduction |
| **Offtaker Type** | MERCHANT | -12 | Higher revenue risk without contracted buyer |
| | COMMUNITY_SOLAR | -6 | Moderate subscriber acquisition risk |
| | C_AND_I | -4 | Verify creditworthiness of counterparty |
| | UTILITY | -2 | Strong counterparty, minimal risk |
| **Documents** | Each missing required doc | -3 (max -24) | Upload outstanding items |
| **Tax Credit Estimate** | Missing | -8 | Provide estimated tax credit value |
| **Tax Credit Transferability** | Not ready | -6 | Confirm transferability eligibility |
| **No Capital Stack** | Missing entirely | -14 | Complete financial information |
| **FEOC Attestation** | Not provided | -8 | Complete FEOC compliance attestation |

### Rating Thresholds

| Rating | Condition |
|---|---|
| **GREEN** | Score >= 75 AND no fatal flags |
| **YELLOW** | Score 50–74, no fatal flags |
| **RED** | Score < 50 OR fatal flag present |

### Fatal Flags

A project is forced to RED regardless of score if:
- Site control status is `NONE`
- Interconnection status is `UNKNOWN` while the project is at `NTP` or `CONSTRUCTION` stage

### Risk Flags Tracked

- `siteControlRisk`
- `interconnectionRisk`
- `permittingRisk`
- `offtakerRisk`
- `missingDocs`
- `feocRisk`

---

## 2. Checklist Generation

Generates a data room checklist based on project stage.

**Base items (all projects):**
- Site Control Documentation (LOI/Option/Lease) — required
- Interconnection Application / Status Evidence — required
- Permitting Evidence — required
- Basic Financial Model — required
- FEOC Compliance Attestation — required

**Additional items (NTP / CONSTRUCTION / COD stages):**
- EPC Contract or Term Sheet — required
- Insurance Evidence — optional

---

## 3. Capital Stack Engine

Computes equity needed after tax credit offsets.

```
equityNeeded = max(totalCapex - taxCreditEstimated, 0)
debtPlaceholder = 0
```

---

## 4. Yield Computation Engine

### Revenue Calculation

Converts SCADA energy production data into revenue using PPA contract rates.

```
grossRevenue = productionMwh * pricePerMwh
operatingExpenses = grossRevenue * 0.15        (15% opex rate)
netRevenue = grossRevenue - operatingExpenses
```

### Distribution Calculation

Splits net revenue between investors and the platform.

```
platformFee = netRevenue * 0.0075              (0.75% platform fee)
investorShare = netRevenue - platformFee
totalDistributable = netRevenue
```

---

## Full Pipeline

```
SCADA Data → Energy Production (MWh)
  → PPA Rate × MWh = Gross Revenue
    → Gross Revenue - 15% Opex = Net Revenue
      → Net Revenue - 0.75% Platform Fee = Investor Share
        → Investor Yield Dashboard
```
