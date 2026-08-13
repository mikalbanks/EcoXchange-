"""Where a `plant_analytics` row goes (spec 22 §4).

§4 says `refresh_analytics()` "writes one plant_analytics row". This module is
what "writes" means, and the answer is currently not "INSERTs into Postgres".

The engine has no database driver and no credentials in its loop, by choice —
spec 21's ingestion run produced an idempotent `.sql` seed rather than
connecting, and `MemStorage` is still the app's persistence. Adding psycopg here
to satisfy one verb would put database credentials into a batch job that
otherwise reads a public S3 bucket and writes files.

So: a sink protocol with a SQL-seed implementation as the default. When Supabase
is wired through, a `PostgresSink` implements the same two methods and no caller
changes. The seam is deliberate — persistence is cross-cutting here, and this is
the one place that needs to know about it.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol, runtime_checkable

from .results import PlantAnalyticsRow


@runtime_checkable
class AnalyticsSink(Protocol):
    """The whole contract. A `PostgresSink` implements exactly this."""

    def write(self, row: PlantAnalyticsRow) -> str:
        """Persist one row. Returns its id."""
        ...

    def finalize(self, run: dict) -> None:
        """Called once when a run completes, with the run record."""
        ...


# ── SQL literals ──────────────────────────────────────────────────────────────

def sql_literal(value) -> str:
    """A Postgres literal for a Python scalar.

    Same construction as `scripts/ingest_pvdaq.py:q()`. NaN becomes NULL rather
    than the bare token `NaN`, which Postgres accepts for a float column and
    which then reads as a measurement.
    """
    if value is None:
        return "NULL"
    if isinstance(value, float) and value != value:            # NaN
        return "NULL"
    if isinstance(value, float) and value in (float("inf"), float("-inf")):
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, (datetime,)):
        return "'" + value.isoformat() + "'"
    return "'" + str(value).replace("'", "''") + "'"


def _iso(value) -> str | None:
    return value.isoformat() if hasattr(value, "isoformat") else value


#: Column order for the generated INSERT. Matches migration 014.
_COLUMNS = (
    "id", "project_id", "as_of_date", "window_start", "window_end",
    "degradation_pct_per_yr", "degradation_ci_low", "degradation_ci_high",
    "degradation_method",
    "soiling_loss_pct", "soiling_ci_low", "soiling_ci_high", "soiling_ratio",
    "availability_pct", "lost_production_kwh", "outage_count",
    "ppa_rate_per_kwh", "soiling_loss_usd", "availability_loss_usd",
    "n_days_analyzed", "rdtools_version", "engine_version", "computed_at",
)

#: Everything except the natural key, so a replay updates rather than conflicts.
_UPDATABLE = tuple(
    c for c in _COLUMNS
    if c not in ("id", "project_id", "as_of_date", "degradation_method")
)


def row_to_sql(row: PlantAnalyticsRow) -> str:
    """One idempotent INSERT ... ON CONFLICT DO UPDATE for a row.

    Keyed on `unique_project_asof (project_id, as_of_date, degradation_method)`
    rather than `id`, because a re-run produces a fresh `id` for the same logical
    row. Conflicting on `id` would insert a duplicate every time the job ran.
    """
    data = row.to_dict()
    values = ",\n    ".join(sql_literal(data[c]) for c in _COLUMNS)
    updates = ",\n    ".join(f"{c} = EXCLUDED.{c}" for c in _UPDATABLE)

    note_lines = "".join(f"--   * {n}\n" for n in row.notes)
    header = (
        f"-- {row.project_id} — method {row.degradation_method}, window "
        f"{_iso(row.window_start)} .. {_iso(row.window_end)}, "
        f"{row.n_days_analyzed} days analyzed\n"
    )
    if note_lines:
        header += "-- Notes carried with this row:\n" + note_lines

    return f"""{header}INSERT INTO plant_analytics (
    {", ".join(_COLUMNS)}
) VALUES (
    {values}
)
ON CONFLICT (project_id, as_of_date, degradation_method) DO UPDATE SET
    {updates};
"""


class SqlSeedSink:
    """Accumulates rows and writes one idempotent seed file (the default).

    Mirrors `scripts/ingest_pvdaq.py`'s output contract: a file that can be
    replayed against the database any number of times without duplicating or
    diverging.
    """

    def __init__(self, path: Path | str, *, header: str = "") -> None:
        self.path = Path(path)
        self.header = header
        self.rows: list[PlantAnalyticsRow] = []

    def write(self, row: PlantAnalyticsRow) -> str:
        self.rows.append(row)
        return row.id

    def finalize(self, run: dict) -> None:
        generated = run.get("generated_at", datetime.now(timezone.utc).isoformat())
        parts = [f"""-- 006_plant_analytics.sql
-- Spec 22 §6 — measured degradation, soiling and availability for the seeded
-- PVDAQ systems, computed with NREL RdTools {run.get('rdtools_version', '?')}.
--
-- Regenerate: python3 verification-engine/scripts/run_analytics.py
-- Requires migration 014 (plant_analytics) and seed 005 (the projects rows
-- these reference).
--
-- Every degradation rate here carries a 95% confidence interval, because a rate
-- without one is not defensible and defensibility is the point (§3). RdTools'
-- own default interval is 68.2%; the engine overrides it explicitly.
--
-- Generated {generated} — engine {run.get('engine_version', '?')}, rdtools {run.get('rdtools_version', '?')}.
{self.header}"""]

        if not self.rows:
            parts.append(
                "\n-- NO ROWS. Every registered project failed or was skipped; "
                "see reports/plant_analytics.json for the exception behind each.\n"
            )
        for row in self.rows:
            parts.append("\n" + row_to_sql(row))

        # A run that produced nothing still records the shortfall, per §7.7's
        # discipline: report the gap rather than leaving an empty file that reads
        # like it was never run.
        for skip in run.get("skipped", []):
            parts.append(
                f"\n-- {skip.get('system_id', '?')}: NOT ANALYZED — "
                f"{skip.get('reason', 'no reason recorded')}\n"
            )

        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text("".join(parts))


class JsonArtifactSink:
    """Writes the full run record, including everything the table cannot hold.

    The table stores 23 columns. The reasons behind them — window rationale,
    frozen normalization inputs, PPA and availability bases, pre-run caveats,
    the clear-sky/sensor disagreement — do not fit in columns and are exactly
    what makes a number auditable. They live here, and this file is what the web
    reports read.
    """

    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)
        self.rows: list[PlantAnalyticsRow] = []

    def write(self, row: PlantAnalyticsRow) -> str:
        self.rows.append(row)
        return row.id

    def finalize(self, run: dict) -> None:
        payload = {**run, "rows": [r.to_dict() for r in self.rows]}
        self.path.parent.mkdir(parents=True, exist_ok=True)
        # allow_nan=False: `json.dumps` emits a bare `NaN` by default, which is
        # not JSON and which the TypeScript reader would reject at parse time —
        # after the expensive part of the run had already finished.
        self.path.write_text(json.dumps(payload, indent=2, allow_nan=False))


class MultiSink:
    """Fans one run out to several sinks. The runner writes JSON and SQL both."""

    def __init__(self, *sinks: AnalyticsSink) -> None:
        self.sinks = sinks

    def write(self, row: PlantAnalyticsRow) -> str:
        for sink in self.sinks:
            sink.write(row)
        return row.id

    def finalize(self, run: dict) -> None:
        for sink in self.sinks:
            sink.finalize(run)
