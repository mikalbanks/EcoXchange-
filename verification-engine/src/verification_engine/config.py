"""System configuration models.

A `SystemConfig` fully describes one PV asset for verification: where it is,
how the array is oriented, its DC/AC ratings, the loss assumptions, and the
commissioning date (needed for age-based degradation).

Everything downstream (irradiance fetch, modelchain, losses, P50/P90) is driven
off this object so a verification run is fully reproducible from one config file.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import date
from typing import Optional
import hashlib
import json
import yaml


@dataclass
class Location:
    latitude: float
    longitude: float
    altitude: float = 0.0
    tz: str = "America/New_York"  # real Olson tz (DST-aware); override per site


@dataclass
class LossAssumptions:
    """Component losses in PERCENT, matching pvlib.pvsystem.pvwatts_losses().

    Defaults are the NREL PVWatts reference values. Override per project from an
    independent engineering (IE) report when you have one.
    """
    soiling: float = 2.0
    shading: float = 3.0
    snow: float = 0.0
    mismatch: float = 2.0
    wiring: float = 2.0
    connections: float = 0.5
    lid: float = 1.5            # light-induced degradation
    nameplate_rating: float = 1.0
    availability: float = 3.0

    def as_pvwatts_kwargs(self) -> dict:
        # `age` is intentionally excluded here; we model degradation explicitly
        # by commissioning date so it appears as its own waterfall line.
        return {
            "soiling": self.soiling,
            "shading": self.shading,
            "snow": self.snow,
            "mismatch": self.mismatch,
            "wiring": self.wiring,
            "connections": self.connections,
            "lid": self.lid,
            "nameplate_rating": self.nameplate_rating,
            "age": 0.0,
            "availability": self.availability,
        }


@dataclass
class ArrayConfig:
    surface_tilt: float
    surface_azimuth: float = 180.0          # 180 = due south (northern hemisphere)
    dc_capacity_kw: float = 1000.0
    ac_capacity_kw: Optional[float] = None  # defaults to dc/1.2 if None (DC/AC ~1.2)
    gamma_pdc: float = -0.0035              # power temp coeff, 1/°C (mono-Si ~ -0.35%/°C)
    temperature_model: str = "open_rack_glass_glass"

    def ac_capacity(self) -> float:
        return self.ac_capacity_kw if self.ac_capacity_kw else self.dc_capacity_kw / 1.2


@dataclass
class SystemConfig:
    name: str
    location: Location
    array: ArrayConfig
    losses: LossAssumptions = field(default_factory=LossAssumptions)
    commission_date: date = date(2022, 1, 1)
    degradation_rate_per_year: float = 0.0075  # 0.75%/yr (NREL); aligns w/ projects table

    def years_since_commission(self, as_of: date) -> float:
        return max(0.0, (as_of - self.commission_date).days / 365.25)

    def config_hash(self) -> str:
        """Deterministic hash of the config for the audit trail."""
        blob = json.dumps(_to_serializable(self), sort_keys=True).encode()
        return hashlib.sha256(blob).hexdigest()[:16]


def _to_serializable(obj) -> dict:
    d = asdict(obj)
    # dates -> isoformat for hashing / json
    def fix(x):
        if isinstance(x, date):
            return x.isoformat()
        if isinstance(x, dict):
            return {k: fix(v) for k, v in x.items()}
        if isinstance(x, list):
            return [fix(v) for v in x]
        return x
    return fix(d)


def load_config(path: str) -> SystemConfig:
    with open(path) as fh:
        raw = yaml.safe_load(fh)

    loc = Location(**raw["location"])
    arr = ArrayConfig(**raw["array"])
    losses = LossAssumptions(**raw.get("losses", {}))
    cd = raw.get("commission_date", "2022-01-01")
    cd = date.fromisoformat(cd) if isinstance(cd, str) else cd
    return SystemConfig(
        name=raw["name"],
        location=loc,
        array=arr,
        losses=losses,
        commission_date=cd,
        degradation_rate_per_year=raw.get("degradation_rate_per_year", 0.0075),
    )
