Most solar investment platforms ask you to trust a single number: whatever the
developer reports the project produced. EcoXchange does not. Before a single
dollar of distribution moves, we reconcile **three independent sources** of
production data and require them to agree within tolerance.

## The three sources

1. **Inverter telemetry.** The equipment that converts DC panel output to AC grid
   power reports how many kilowatt-hours it produced, pulled directly from the
   manufacturer's API.
2. **Utility meter data.** The revenue-grade meter the utility uses to pay the
   project — the same number that drives the PPA invoice.
3. **Satellite irradiance.** Independent weather data (NASA POWER and pvlib
   modeling) tells us how much sunlight actually fell on the array, and therefore
   how much the system *should* have produced.

## Why three and not one

Any single source can be wrong. Inverters drift and occasionally over-report.
Meters can be misread or lag. Satellite models are estimates. But it is very hard
for three unrelated systems to be wrong *in the same direction by the same amount*.

> When inverter, meter, and satellite all agree, you are not trusting a developer's
> spreadsheet — you are trusting physics, hardware, and an independent third party
> at once.

## How reconciliation works

The engine computes pairwise deviations and checks them against a tolerance
config:

| Comparison | Tolerance |
|---|---|
| Inverter vs. expected | ±15% |
| Inverter vs. utility | ±10% |
| Utility vs. expected | ±20% |

If every comparison is within tolerance, the month is marked **verified** and a
distribution is triggered. If any check fails, the month is **flagged** for review
and excluded from distributions until resolved.

```
verified = within(inv_vs_expected, 15)
        && within(inv_vs_utility, 10)
        && within(util_vs_expected, 20)
```

## What this means for you

Every figure on your dashboard — yield, cumulative production, environmental
impact — is computed from **verified** months only. Flagged months never inflate
your returns. That is the difference between production-*verified* solar and
production-*projected* solar, and it is the entire point of EcoXchange.
