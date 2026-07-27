"""Pydantic request/response models for the expected-generation endpoint."""

from __future__ import annotations

from datetime import date
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class DailyWeatherInput(BaseModel):
    """One day of meteorological data from the irradiance MCP server."""

    date: date
    ghi_kwh_m2: float = Field(..., description="Global Horizontal Irradiance (kWh/m²/day)")
    dni_kwh_m2: float = Field(..., description="Direct Normal Irradiance (kWh/m²/day)")
    dhi_kwh_m2: float = Field(..., description="Diffuse Horizontal Irradiance (kWh/m²/day)")
    temp_air_c: float = Field(default=20.0, description="Ambient air temperature (°C, daily mean)")
    wind_speed_m_s: float = Field(default=1.0, description="Wind speed at 10m (m/s, daily mean)")


class ProjectSystemInput(BaseModel):
    """Solar PV system configuration — matches the projects table schema."""

    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    capacity_kw_dc: float = Field(..., gt=0, description="Nameplate DC capacity in kW")
    tilt_deg: float = Field(..., ge=0, le=90, description="Panel tilt angle in degrees")
    azimuth_deg: float = Field(..., ge=0, le=360, description="Panel azimuth (180 = south)")
    module_efficiency: float = Field(default=0.20, ge=0.05, le=0.30)
    system_losses: float = Field(
        default=0.14,
        ge=0.0,
        le=0.50,
        description="Non-temperature system losses (soiling, wiring, mismatch, etc.)",
    )
    degradation_rate: float = Field(
        default=0.0075, ge=0.0, le=0.05, description="Annual degradation rate"
    )
    degradation_model: Literal["linear", "piecewise_nrel"] = Field(
        default="linear",
        description=(
            'Degradation model: "linear" (historical default, back-compat) '
            'or "piecewise_nrel" (NREL-informed: 2% LID yr 0-1, 0.7%/yr '
            "yr 1-5, 0.5%/yr yr 5-25, 0.8%/yr yr 25+)"
        ),
    )
    commissioning_date: date

    # Optional fields for higher-fidelity modeling.
    module_type: Optional[str] = Field(
        default="monocrystalline",
        description="Module technology: monocrystalline, polycrystalline, thin_film, cdte",
    )
    inverter_efficiency: Optional[float] = Field(
        default=0.96, ge=0.80, le=0.99, description="Weighted CEC inverter efficiency"
    )
    dc_ac_ratio: Optional[float] = Field(
        default=1.2,
        ge=0.8,
        le=2.0,
        description="DC/AC ratio (DC nameplate / AC inverter rating)",
    )
    albedo: Optional[float] = Field(
        default=0.2,
        ge=0.0,
        le=0.9,
        description="Ground reflectance (0.2 = vegetation, 0.5 = concrete, 0.8 = snow)",
    )
    racking_type: Optional[str] = Field(
        default="open_rack",
        description="Mounting type: open_rack, roof_mount, single_axis_tracker",
    )


class ExpectedGenerationRequest(BaseModel):
    """Full request to calculate expected generation."""

    project: ProjectSystemInput
    daily_weather: list[DailyWeatherInput]
    weather_source: str = Field(
        default="irradiance_mcp",
        description="Provenance of the supplied weather (e.g. irradiance_mcp, nsrdb, nasa_power)",
    )


class SiteExpectedGenerationRequest(ProjectSystemInput):
    """Site-level convenience request (dashboard client, /api/expected-generation).

    Flat project specs plus a date range — the service fetches NASA POWER
    daily weather itself and delegates to the canonical engine path. Kept as
    a subclass of ProjectSystemInput so the spec fields stay in one place.
    """

    start_date: date
    end_date: date


class MonthlyBreakdown(BaseModel):
    """Monthly expected generation breakdown."""

    month: str  # "2024-01"
    expected_kwh: float
    poa_irradiance_kwh_m2: float
    cell_temperature_avg_c: float
    performance_ratio: float
    capacity_factor: float
    days_in_month: int
    days_with_data: int


class LossWaterfallLine(BaseModel):
    """One step of the IE-style energy loss waterfall (from Engine A)."""

    step: str
    loss_pct: float
    energy_after_kwh: float


class ExpectedGenerationResponse(BaseModel):
    """Full response from the expected generation calculation.

    The ``p50_kwh`` / ``p90_kwh`` / ``combined_uncertainty_pct`` /
    ``weather_source`` / ``engine_version`` / ``loss_waterfall`` fields are the
    additive, back-compatible growth from wrapping Engine A — existing callers
    that only read ``total_expected_kwh`` + ``monthly_breakdown`` are unaffected.
    """

    total_expected_kwh: float
    monthly_breakdown: list[MonthlyBreakdown]
    system_summary: dict[str, Any]
    model_metadata: dict[str, Any]
    warnings: list[str]

    # Additive Engine A fields.
    p50_kwh: float
    p90_kwh: float
    combined_uncertainty_pct: float
    weather_source: str
    engine_version: str
    loss_waterfall: list[LossWaterfallLine]
