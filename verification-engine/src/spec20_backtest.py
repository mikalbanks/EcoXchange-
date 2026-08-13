"""Reproduce EcoXchange Spec 20 from pinned public EIA inputs.

This module is intentionally separate from ``validate_eia_fleet``.  The latter
is an annual, mixed-geometry benchmark.  Spec 20 is a monthly, EIA-860-only,
pure fixed-tilt study.  Mixing those cohorts would create plausible but false
"reproductions".

The public-data command stops after writing provenance and cohort artifacts when
the observed cohort differs from the specification.  Continue only with
``--accept-source-drift`` and label the result as a new study, never Spec 20.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import math
import shutil
import sys
import urllib.request
import zipfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable, Mapping, Sequence

import numpy as np
import pandas as pd


SPEC20_YEAR = 2024
EIA860_URL = "https://www.eia.gov/electricity/data/eia860/xls/eia8602024.zip"
EIA923_URL = "https://www.eia.gov/electricity/data/eia923/archive/xls/f923_2024.zip"

# Hashes of the official files retrieved 2026-08-13.  The URLs are not
# content-addressed, so these identify the retrieved source revision rather
# than merely the nominal survey year.
KNOWN_SOURCE_SHA256 = {
    "eia8602024.zip": "0aaae04812cd4ab87a3e346bdf93848a3cc15053fd4dc2a4cf82d2aeac95f12b",
    "f923_2024.zip": "272055f2d748f6486fc3076abd5a40ec736dbff45458bdb4c895761278c50f2b",
}

EXPECTED_COHORT_COUNTS = {
    "eia860_operable_solar_generators": 7154,
    "fixed_tilt_complete_generators": 3931,
    "pure_fixed_tilt_complete_plants": 3453,
    "capacity_and_online_plants": 2915,
    "eia923_pure_solar_matches": 2711,
    "capacity_factor_and_coordinates_plants": 2635,
    "successfully_modeled_plants": 2621,
    "model_cache_failures": 14,
    "target_plant_months": 31356,
}

MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]
NETGEN_COLUMNS = [f"Netgen {month}" for month in MONTHS]


class SourceRevisionMismatch(RuntimeError):
    """The pinned public files no longer construct the claimed cohort."""


@dataclass(frozen=True)
class SourceRecord:
    name: str
    url: str
    sha256: str
    size_bytes: int


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download_sources(raw_dir: Path) -> list[SourceRecord]:
    """Download official EIA archives without mutating any external service."""
    raw_dir.mkdir(parents=True, exist_ok=True)
    records: list[SourceRecord] = []
    for name, url in (("eia8602024.zip", EIA860_URL), ("f923_2024.zip", EIA923_URL)):
        target = raw_dir / name
        if not target.exists():
            partial = target.with_suffix(target.suffix + ".partial")
            with urllib.request.urlopen(url, timeout=120) as response, partial.open("wb") as out:
                shutil.copyfileobj(response, out)
            partial.replace(target)
        records.append(SourceRecord(name, url, sha256_file(target), target.stat().st_size))
    return records


def extract_sources(raw_dir: Path, extracted_dir: Path) -> None:
    extracted_dir.mkdir(parents=True, exist_ok=True)
    for archive in (raw_dir / "eia8602024.zip", raw_dir / "f923_2024.zip"):
        with zipfile.ZipFile(archive) as bundle:
            bundle.extractall(extracted_dir)


def _numeric(frame: pd.DataFrame, columns: Iterable[str]) -> None:
    for column in columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")


def _read_inputs(extracted_dir: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    solar = pd.read_excel(
        extracted_dir / "3_3_Solar_Y2024.xlsx", sheet_name="Operable", header=1,
    )
    plants = pd.read_excel(
        extracted_dir / "2___Plant_Y2024.xlsx", sheet_name="Plant", header=1,
    )
    eia923_path = next(extracted_dir.glob("EIA923_Schedules_2_3_4_5_M_12_2024*.xlsx"))
    generation = pd.read_excel(
        eia923_path, sheet_name="Page 1 Generation and Fuel Data", header=5,
    )
    solar.columns = [str(c).replace("\n", " ").strip() for c in solar.columns]
    plants.columns = [str(c).replace("\n", " ").strip() for c in plants.columns]
    generation.columns = [str(c).replace("\n", " ").strip() for c in generation.columns]
    return solar, plants, generation


def construct_cohort(
    solar: pd.DataFrame,
    plants: pd.DataFrame,
    generation: pd.DataFrame,
) -> tuple[pd.DataFrame, dict[str, int]]:
    """Construct the Spec 20 cohort with an auditable count at every filter."""
    solar = solar.copy()
    plants = plants.copy()
    generation = generation.copy()
    _numeric(
        solar,
        ["Plant Code", "Nameplate Capacity (MW)", "Operating Year", "Tilt Angle",
         "Azimuth Angle", "DC Net Capacity (MW)"],
    )
    _numeric(plants, ["Plant Code", "Latitude", "Longitude"])
    _numeric(generation, ["Plant Id", *NETGEN_COLUMNS])

    is_pv = solar["Technology"].eq("Solar Photovoltaic") & solar["Prime Mover"].eq("PV")
    complete_fixed = (
        is_pv
        & solar["Fixed Tilt?"].eq("Y")
        & solar[["Tilt Angle", "Azimuth Angle", "DC Net Capacity (MW)"]].notna().all(axis=1)
    )
    solar["_complete_fixed"] = complete_fixed

    # A plant is pure fixed-tilt only when every EIA-860 solar generator at the
    # plant is fixed and has its own complete geometry.  Grouping only the good
    # rows would quietly keep mixed fixed/tracking plants.
    grouped = solar.groupby("Plant Code", sort=True).agg(
        plant_name=("Plant Name", "first"),
        state=("State", "first"),
        all_complete_fixed=("_complete_fixed", "all"),
        generator_count=("Generator ID", "size"),
        capacity_dc_mw=("DC Net Capacity (MW)", "sum"),
        capacity_ac_mw=("Nameplate Capacity (MW)", "sum"),
        commissioning_year=("Operating Year", "max"),
        tilt_deg=("Tilt Angle", _capacity_weighted_placeholder),
        azimuth_deg=("Azimuth Angle", _capacity_weighted_placeholder),
    )
    pure = grouped[grouped["all_complete_fixed"]].copy()

    # Recompute plant geometry as DC-capacity-weighted means.  EIA reports the
    # geometry per generator while NASA POWER weather is modeled per plant.
    for plant_id in pure.index:
        rows = solar[solar["Plant Code"].eq(plant_id)]
        weights = rows["DC Net Capacity (MW)"].astype(float)
        pure.loc[plant_id, "tilt_deg"] = np.average(rows["Tilt Angle"], weights=weights)
        pure.loc[plant_id, "azimuth_deg"] = circular_weighted_mean_deg(
            rows["Azimuth Angle"].to_numpy(float), weights.to_numpy(float),
        )

    sized = pure[
        pure["capacity_dc_mw"].between(1.0, 20.0, inclusive="both")
        & pure["commissioning_year"].le(2022)
    ].copy()

    is_solar_row = (
        generation["Reported Fuel Type Code"].eq("SUN")
        & generation["Reported Prime Mover"].eq("PV")
    )
    generation["_is_solar"] = is_solar_row
    purity = generation.groupby("Plant Id")["_is_solar"].all()
    pure_solar_ids = set(purity[purity].index.dropna().astype(int))
    solar_generation = (
        generation[is_solar_row]
        .groupby("Plant Id", sort=True)[NETGEN_COLUMNS]
        .sum(min_count=1)
    )
    sized.index = sized.index.astype(int)
    matched = sized.join(solar_generation, how="inner")
    matched = matched.loc[matched.index.intersection(pure_solar_ids)].copy()

    matched["actual_annual_mwh"] = matched[NETGEN_COLUMNS].sum(axis=1, min_count=1)
    matched["actual_capacity_factor_pct"] = (
        matched["actual_annual_mwh"] / (matched["capacity_ac_mw"] * 8760.0) * 100.0
    )
    coords = plants.set_index("Plant Code")[["Latitude", "Longitude"]]
    matched = matched.join(coords, how="left")
    cohort = matched[
        matched["actual_annual_mwh"].gt(0)
        & matched["actual_capacity_factor_pct"].between(5.0, 40.0, inclusive="both")
        & matched[["Latitude", "Longitude"]].notna().all(axis=1)
    ].copy()
    cohort.index.name = "plant_id"
    cohort = cohort.reset_index().sort_values("plant_id").reset_index(drop=True)

    counts = {
        "eia860_operable_solar_generators": int(len(solar)),
        "fixed_tilt_complete_generators": int(complete_fixed.sum()),
        "pure_fixed_tilt_complete_plants": int(len(pure)),
        "capacity_and_online_plants": int(len(sized)),
        "eia923_pure_solar_matches": int(len(matched)),
        "capacity_factor_and_coordinates_plants": int(len(cohort)),
    }
    return cohort, counts


def _capacity_weighted_placeholder(values: pd.Series) -> float:
    """Groupby placeholder, replaced with a weighted value after aggregation."""
    numeric = pd.to_numeric(values, errors="coerce")
    return float(numeric.mean())


def circular_weighted_mean_deg(angles: np.ndarray, weights: np.ndarray) -> float:
    radians = np.deg2rad(angles)
    x = float(np.average(np.cos(radians), weights=weights))
    y = float(np.average(np.sin(radians), weights=weights))
    result = float(np.rad2deg(np.arctan2(y, x)) % 360.0)
    return 0.0 if math.isclose(result, 360.0, abs_tol=1e-12) else result


def assert_utc_and_daylight(weather: pd.DataFrame, latitude: float, longitude: float) -> float:
    """Enforce UTC and fail if >1% of GHI energy lies below the horizon."""
    import pvlib

    if weather.index.tz is None or str(weather.index.tz) != "UTC":
        raise ValueError("Spec 20 weather must be indexed in tz-aware UTC")
    solpos = pvlib.solarposition.get_solarposition(weather.index, latitude, longitude)
    ghi = pd.to_numeric(weather["ghi"], errors="coerce").clip(lower=0).fillna(0)
    total = float(ghi.sum())
    below = float(ghi[solpos["apparent_elevation"].lt(0)].sum())
    fraction = 0.0 if total == 0 else below / total
    if fraction > 0.01:
        raise ValueError(
            f"{fraction:.2%} of GHI lies below the horizon; maximum is 1.00%"
        )
    return fraction


def model_monthly_mwh(row: Mapping[str, object], weather: pd.DataFrame) -> pd.Series:
    """Run the exact Spec 20 fixed-tilt pvlib 0.15.2 model for one plant."""
    import pvlib
    from pvlib.modelchain import ModelChain
    from pvlib.pvsystem import Array, FixedMount, PVSystem
    from pvlib.temperature import TEMPERATURE_MODEL_PARAMETERS

    if pvlib.__version__ != "0.15.2":
        raise RuntimeError(f"Spec 20 requires pvlib 0.15.2, found {pvlib.__version__}")
    latitude, longitude = float(row["Latitude"]), float(row["Longitude"])
    assert_utc_and_daylight(weather, latitude, longitude)

    dc_w = float(row["capacity_dc_mw"]) * 1_000_000.0
    ac_w = float(row["capacity_ac_mw"]) * 1_000_000.0
    mount = FixedMount(
        surface_tilt=float(row["tilt_deg"]), surface_azimuth=float(row["azimuth_deg"]),
    )
    array = Array(
        mount=mount,
        module_parameters={"pdc0": dc_w, "gamma_pdc": -0.004},
        temperature_model_parameters=TEMPERATURE_MODEL_PARAMETERS["sapm"][
            "open_rack_glass_polymer"
        ],
    )
    system = PVSystem(
        arrays=[array],
        inverter_parameters={"pdc0": ac_w / 0.96, "eta_inv_nom": 0.96},
    )
    location = pvlib.location.Location(latitude, longitude, tz="UTC")
    chain = ModelChain(
        system,
        location,
        transposition_model="haydavies",
        aoi_model="physical",
        spectral_model="no_loss",
        dc_model="pvwatts",
        ac_model="pvwatts",
        losses_model="no_loss",
    )
    chain.run_model(weather)
    gross_kwh = chain.results.ac.clip(lower=0) / 1000.0
    years = max(0.0, SPEC20_YEAR - float(row["commissioning_year"]))
    degradation = max(0.0, 1.0 - 0.0075 * years)
    net_kwh = gross_kwh * 0.86 * degradation

    # EIA's month boundary is local.  Spec 20 used the documented
    # longitude-derived fixed offset rather than a timezone database.
    offset_hours = int(round(longitude / 15.0))
    local = net_kwh.copy()
    local.index = local.index + pd.Timedelta(hours=offset_hours)
    return local.resample("MS").sum() / 1000.0


def write_cohort_artifacts(
    cohort: pd.DataFrame,
    counts: Mapping[str, int],
    sources: Sequence[SourceRecord],
    output_dir: Path,
) -> dict[str, object]:
    output_dir.mkdir(parents=True, exist_ok=True)
    cohort_path = output_dir / "cohort.csv"
    columns = [
        "plant_id", "plant_name", "state", "generator_count", "capacity_dc_mw",
        "capacity_ac_mw", "commissioning_year", "tilt_deg", "azimuth_deg",
        "Latitude", "Longitude", "actual_annual_mwh", "actual_capacity_factor_pct",
        *NETGEN_COLUMNS,
    ]
    cohort.to_csv(cohort_path, index=False, columns=columns, float_format="%.8f")
    mismatches = {
        key: {"expected": EXPECTED_COHORT_COUNTS[key], "observed": int(value)}
        for key, value in counts.items()
        if EXPECTED_COHORT_COUNTS[key] != value
    }
    source_mismatches = {
        source.name: {"expected": KNOWN_SOURCE_SHA256.get(source.name), "observed": source.sha256}
        for source in sources
        if KNOWN_SOURCE_SHA256.get(source.name) not in (None, source.sha256)
    }
    evidence = {
        "schema_version": 1,
        "study": "EcoXchange Spec 20 — Real-Data Backtest & Threshold Recalibration",
        "source_year": SPEC20_YEAR,
        "software_versions": {
            name: importlib.metadata.version(name)
            for name in ("pvlib", "pandas", "numpy", "openpyxl")
        },
        "status": "blocked_cohort_mismatch" if mismatches or source_mismatches else "cohort_verified",
        "sources": [asdict(source) for source in sources],
        "cohort_counts": dict(counts),
        "expected_cohort_counts": EXPECTED_COHORT_COUNTS,
        "cohort_mismatches": mismatches,
        "source_hash_mismatches": source_mismatches,
        "model_contract": {
            "pvlib": "0.15.2",
            "transposition": "haydavies",
            "aoi": "physical",
            "spectral": "no_loss",
            "dc": {"model": "pvwatts", "pdc0": "EIA-860 DC net capacity", "gamma_pdc": -0.004},
            "inverter": {"model": "pvwatts", "pdc0": "EIA-860 AC nameplate / 0.96", "eta_inv_nom": 0.96},
            "temperature": "sapm open_rack_glass_polymer",
            "system_loss_fraction": 0.14,
            "linear_degradation_per_year": 0.0075,
            "month_boundary": "round(longitude / 15) fixed UTC offset",
            "utc_guard_max_below_horizon_ghi_fraction": 0.01,
        },
        "artifacts": {
            "cohort.csv": {"sha256": sha256_file(cohort_path), "rows": len(cohort)},
            "merged_results.csv": {"status": "not_generated"},
            "monthly_long.csv": {"status": "not_generated"},
            "holdout_results.json": {"status": "not_generated"},
            "threshold_evaluation.json": {"status": "not_generated"},
        },
        "claims_verified": [],
        "claims_unverified": [
            "annual deviation distribution", "monthly flag rates", "seasonal residuals",
            "odd/even calibration hold-out", "adaptive threshold rates",
        ],
        "message": (
            "The current official EIA files do not construct the Spec 20 cohort under "
            "the documented selection rules. The exact input revision or missing selection "
            "detail is not available. "
            "Downstream modeling is stopped to avoid substituting a different study."
        ),
    }
    evidence_path = output_dir / "evidence.json"
    evidence_path.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n")
    return evidence


def reproduce(args: argparse.Namespace) -> int:
    work_dir = Path(args.work_dir)
    raw_dir, extracted_dir = work_dir / "raw", work_dir / "extracted"
    sources = download_sources(raw_dir)
    extract_sources(raw_dir, extracted_dir)
    solar, plants, generation = _read_inputs(extracted_dir)
    cohort, counts = construct_cohort(solar, plants, generation)
    evidence = write_cohort_artifacts(cohort, counts, sources, Path(args.output_dir))
    print(json.dumps({"status": evidence["status"], "cohort_counts": counts}, indent=2))
    if evidence["status"] != "cohort_verified" and not args.accept_source_drift:
        print(
            "Spec 20 reproduction blocked: current public inputs and documented selection "
            "rules do not produce the claimed cohort. See evidence.json.",
            file=sys.stderr,
        )
        return 2
    if args.accept_source_drift:
        print(
            "Source drift accepted for exploration only. The result must not be labeled a Spec 20 verification.",
            file=sys.stderr,
        )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--work-dir", default="data/spec20")
    parser.add_argument("--output-dir", default="reports/spec20")
    parser.add_argument(
        "--accept-source-drift", action="store_true",
        help="Continue a new exploratory study after a cohort mismatch; never verifies Spec 20.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    return reproduce(build_parser().parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
