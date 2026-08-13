"""Which projects analytics runs on, and over what window (spec 22 §6).

Two windows exist per system and they are not the same window.

The **ingestion** window (`scripts/ingest_pvdaq.py:WINDOWS`) is chosen for
reconciliation: 24 consecutive months of clean telemetry is what a monthly
VERIFIED/FLAGGED verdict needs, and more than that buys nothing.

The **analytics** window here is chosen for what year-on-year degradation needs,
which is different and greedier. YoY compares each daily point to the same point
one year prior, so a 24-month record yields roughly one year of usable pairs and
a correspondingly wide confidence interval. Every extra month of defensible
record tightens the band on the one number the paid tier exists to defend, so
each window below runs to the edge of what the published data actually supports
— and stops exactly there, for a reason recorded next to it.

Stopping there matters more than extending. Spec 21's findings document three
places where the lake will happily serve data that produces a plausible wrong
answer rather than an error, and a degradation rate is downstream of all of them.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


def project_uuid(system_id: int) -> str:
    """Deterministic project UUID for a PVDAQ system id.

    Re-running a seed updates rows instead of duplicating them, and a project id
    stays legible in a log. Same construction as spec 19's 9068 project id.

    Spec 21's ingestion script and spec 22's analytics both key rows on this, so
    it lives in one place. Two copies that agree today are two copies that can
    disagree later, and the failure would be a `plant_analytics` row pointing at
    a project that does not exist — or worse, at the wrong one.
    """
    return f"{system_id:08d}-0000-4000-8000-{system_id:012d}"


@dataclass(frozen=True)
class AnalyticsProject:
    """A project analytics can run on, and the window it may use."""

    system_id: int
    name: str
    telemetry_source: str
    external_id: str
    window_start: date
    window_end: date
    #: Why this window and not the full record. Carried into the artifact: a
    #: degradation rate whose window has no stated basis is not auditable.
    window_rationale: str
    #: `projects.ppa_rate_per_kwh`. NULL for every seeded system — the PVDAQ
    #: index publishes no offtake terms — so the economic translation runs on a
    #: stated default and labels itself an estimate (§4.1).
    ppa_rate_per_kwh: float | None = None
    #: Conditions known before the run that bear on how the result should be
    #: read. Not warnings the code acts on; evidence a reader needs.
    caveats: tuple[str, ...] = field(default_factory=tuple)

    @property
    def project_id(self) -> str:
        return project_uuid(self.system_id)

    @property
    def window_months(self) -> float:
        return (self.window_end - self.window_start).days / 30.437


#: The three systems spec 21 actually seeded. 2107 is absent, and that is a
#: property of the published data rather than a gap to fill: its AC power columns
#: state no unit and the data-prize bundle carries no metrics dictionary, so
#: ingesting it means choosing between W and kW with nothing to choose on
#: (spec 21 §2.7). A wrong choice is a silent 1000x error in the production leg,
#: which would then propagate into a degradation rate as a clean-looking number.
SEED_PROJECTS: dict[int, AnalyticsProject] = {
    4902: AnalyticsProject(
        system_id=4902,
        name="NIST Ground 1",
        telemetry_source="pvdaq",
        external_id="4902",
        window_start=date(2014, 8, 1),
        window_end=date(2018, 2, 28),
        window_rationale=(
            "the full published record (2014-08 .. 2018-02), ~3.5 years. Longer "
            "than the 24-month ingestion window on purpose: this is the system "
            "with the most defensible record of the three, so it carries the "
            "tightest confidence interval. The whole-month -999 sentinel "
            "stretches in 2015-05, 2015-06 and parts of 2016 are masked to NaN by "
            "the adapter's MISSING_VALUE_SENTINELS before they reach any "
            "conversion, and RdTools' filters treat NaN as a gap. Left unmasked "
            "they would integrate June 2015 to -520 MWh on a 271 kW plant and "
            "still score 100% complete (spec 21 §2.5)"
        ),
        caveats=(
            "Whole months of the -999 missing-data sentinel fall inside this "
            "window. They are masked to NaN, not measured, so n_days_analyzed "
            "will sit well below the calendar day count.",
        ),
    ),
    1332: AnalyticsProject(
        system_id=1332,
        name="NREL Parking Garage",
        telemetry_source="pvdaq",
        external_id="1332",
        window_start=date(2016, 1, 1),
        window_end=date(2018, 7, 31),
        window_rationale=(
            "2016-01 .. 2018-07, ~2.6 years — hard-capped by the units break. The "
            "metrics dictionary declares raw_units=kW, units=W, calc_scale=1000 "
            "for metered_ac_power throughout, but the stored values are kW "
            "through 2018-07 and W from 2018-08: the channel peaks at 1,051 in "
            "2017-03 and 934,400 in 2018-08 on a 1,153 kW plant. Dictionary-driven "
            "conversion after the break yields a 501 MW peak, and the adapter's "
            "magnitude guard rejects it (spec 21 §2.6). Extending past 2018-07 "
            "would not fail loudly, it would just drop those months and quietly "
            "shorten the window"
        ),
        caveats=(
            "NREL's own index flags this system: qa_status passes but qa_issue "
            "reads 'Wrong mounting config identified. Please manually review.' "
            "The §3.2 filter selects on qa_status and never reads qa_issue.",
            "Tilt is a DC-weighted merge of a 16.77 deg garage deck and a 60 deg "
            "face, giving 38.4 deg — which describes neither array. Clear-sky "
            "normalization models plane-of-array irradiance from that geometry, "
            "so the merge propagates directly into the degradation rate.",
            "spec 21 §3 records a detected time shift of up to 60 minutes over "
            "this system's record, consistent with a logger re-clock.",
        ),
    ),
    9069: AnalyticsProject(
        system_id=9069,
        name="Simon Solar Farm",
        telemetry_source="pvdaq",
        external_id="9069",
        window_start=date(2016, 2, 1),
        window_end=date(2023, 11, 30),
        window_rationale=(
            "the full record (2016-02 .. 2023-11), ~7.8 years. Far longer than "
            "the 24-month demo window, and deliberately so — but read the caveat "
            "before reading the rate"
        ),
        caveats=(
            "Peak output falls from 33.0 MW in 2016 to 24.4 MW in 2023 on a 33 MW "
            "nameplate (spec 21 §3). That is far too steep for degradation alone; "
            "partial outage, curtailment or a changed inverter limit are all "
            "likelier. Expect a degradation rate outside the -0.2 .. -2.5 %/yr "
            "sanity band, and read it as a finding about the plant rather than a "
            "bug in the method. It is reported with the collapse attached.",
            "Reference system only: 33 MW is outside the 1-20 MW band, so it is "
            "never a segment example.",
        ),
    ),
}


#: Systems that exist in the lake and are deliberately NOT analyzed, with the
#: reason. Present so the runner can report the shortfall against §6.1 rather
#: than silently listing three of four.
EXCLUDED_SYSTEMS: dict[int, str] = {
    2107: (
        "not seeded by spec 21. Its 24 AC power columns (e.g. "
        "'inv_01_ac_power_inv_149583') state no unit, and the data-prize bundle "
        "carries no metrics dictionary to resolve one. Inferring kW from "
        "magnitudes against the 27.6 kW ABB inverter nameplate would be a guess, "
        "and a wrong guess is a clean 1000x error. Resolving it needs a unit "
        "statement from NREL, not more code (spec 21 §2.7, §4)."
    ),
}


def get_project(project_id: str) -> AnalyticsProject:
    """Resolve a project UUID to its analytics registration."""
    for project in SEED_PROJECTS.values():
        if project.project_id == project_id:
            return project
    known = ", ".join(p.project_id for p in SEED_PROJECTS.values())
    raise KeyError(
        f"no analytics registration for project {project_id!r}. Registered: "
        f"{known or 'none'}."
    )


def get_project_by_system(system_id: int) -> AnalyticsProject:
    """Resolve a PVDAQ system id to its analytics registration."""
    try:
        return SEED_PROJECTS[system_id]
    except KeyError:
        if system_id in EXCLUDED_SYSTEMS:
            raise KeyError(
                f"system {system_id} is deliberately excluded: "
                f"{EXCLUDED_SYSTEMS[system_id]}"
            ) from None
        raise KeyError(
            f"system {system_id} is not registered for analytics. Registered: "
            f"{sorted(SEED_PROJECTS)}."
        ) from None
