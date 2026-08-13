"""Economic translation (spec 22 §4.1).

The number an owner acts on is dollars, not percent. A soiling loss of 1.8% is a
fact about physics; $42,000 a year is a fact about whether to send a truck.

    soiling_loss_usd      = expected_annual_kwh * (soiling_loss_pct/100) * ppa_rate
    availability_loss_usd = lost_production_kwh * ppa_rate

`projects.ppa_rate_per_kwh` already exists. Where it is NULL — which is the case
for every PVDAQ seed system, because the index publishes no offtake terms — §4.1
says to use a stated default and label the output as an estimate.

"Labelled" is doing real work in that sentence. A dollar figure is the most
quotable thing this module produces and the easiest to lift out of context, so
the label travels with the number rather than sitting in a footnote: every
function here returns an `EconomicTranslation` carrying its own basis, and the
report renders it.

Deliberately free of any rdtools import. §6.7 requires that NULL-PPA handling be
testable, and that test should not need a 200 MB dependency tree to run.
"""
from __future__ import annotations

from .results import EconomicTranslation

#: Stand-in where a project has no PPA rate. The 2023-2024 US utility-scale solar
#: PPA range runs roughly $0.03-$0.06/kWh (LevelTen PPA Price Index); $0.045 sits
#: mid-range. It is a placeholder for arithmetic, not a market view — its only
#: job is to let a percentage become an order of magnitude without pretending to
#: precision it does not have.
DEFAULT_PPA_RATE_PER_KWH = 0.045

DEFAULT_RATE_NOTE = (
    f"No PPA rate on this project, so the dollar figures use a stated default of "
    f"${DEFAULT_PPA_RATE_PER_KWH:.3f}/kWh (mid-range for US utility-scale solar). "
    f"Every dollar amount below is an ESTIMATE and moves proportionally with the "
    f"real rate — at $0.03/kWh they are a third lower, at $0.06/kWh a third "
    f"higher. The percentages are measured; only the translation is assumed."
)


def resolve_ppa_rate(
    ppa_rate_per_kwh: float | None,
) -> tuple[float, str, list[str]]:
    """The rate to use, its basis, and any note that must travel with it.

    Returns `(rate, basis, notes)` where basis is 'cited' or 'estimated'.
    Never raises on None — that is the ordinary case here, not an error (§6.7).
    """
    if ppa_rate_per_kwh is None:
        return DEFAULT_PPA_RATE_PER_KWH, "estimated", [DEFAULT_RATE_NOTE]
    if ppa_rate_per_kwh <= 0:
        # A zero or negative rate is a data error, not a free plant. Falling back
        # is safer than multiplying by it: a $0 loss reads as "no problem here",
        # which is the opposite of what an unset field means.
        return DEFAULT_PPA_RATE_PER_KWH, "estimated", [
            f"Project carries a non-positive PPA rate "
            f"({ppa_rate_per_kwh}/kWh), which cannot be a real offtake price. "
            f"Treated as unset. {DEFAULT_RATE_NOTE}"
        ]
    return float(ppa_rate_per_kwh), "cited", []


def translate(
    *,
    ppa_rate_per_kwh: float | None,
    soiling_loss_pct: float | None = None,
    expected_annual_kwh: float | None = None,
    lost_production_kwh: float | None = None,
) -> EconomicTranslation:
    """§4.1's two formulas, with every input allowed to be absent.

    Absence is the normal case, not an edge case. A site with no soiling signal
    has no `soiling_loss_pct`; a site whose availability analysis could not run
    has no `lost_production_kwh`; every seeded project has no PPA rate. Each
    missing input yields a missing output and a note, never a zero — a $0 loss
    and an uncomputable loss look identical on a report and mean opposite things.
    """
    rate, basis, notes = resolve_ppa_rate(ppa_rate_per_kwh)

    soiling_usd: float | None = None
    if soiling_loss_pct is None:
        notes.append(
            "No soiling loss in dollars: SRR found no soiling signal to price."
        )
    elif expected_annual_kwh is None:
        notes.append(
            "No soiling loss in dollars: the annual expected-energy figure the "
            "percentage multiplies is unavailable, so there is nothing to scale."
        )
    else:
        soiling_usd = expected_annual_kwh * (soiling_loss_pct / 100.0) * rate

    availability_usd: float | None = None
    if lost_production_kwh is None:
        notes.append(
            "No availability loss in dollars: no lost-production estimate was "
            "produced for this window."
        )
    else:
        availability_usd = lost_production_kwh * rate

    return EconomicTranslation(
        ppa_rate_per_kwh=rate,
        basis=basis,
        soiling_loss_usd=soiling_usd,
        availability_loss_usd=availability_usd,
        expected_annual_kwh=expected_annual_kwh,
        notes=notes,
    )
