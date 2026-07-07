from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import ENGINE_VERSION
from .health import router as health_router
from .models import (
    ExpectedGenerationRequest,
    ExpectedGenerationResponse,
    ProjectSystemInput,
    SiteExpectedGenerationRequest,
)
from .pvlib_runner import calculate_expected_generation
from .weather import WeatherFetchError, fetch_nasa_power_daily

app = FastAPI(
    title="EcoXchange pvlib Expected Generation Service",
    version=ENGINE_VERSION,
    description="Calculates expected solar PV generation using pvlib ModelChain.",
)

# The dashboard (a static SPA) calls this service directly from the browser,
# so cross-origin requests from the deployed frontends must be allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # local Vite dev server
        "http://localhost:4173",  # local vite preview
        "http://localhost:3000",  # alternate local port
        "https://demo.ecoxchange.net",
        "https://www.ecoxchange.net",
        "https://ecoxchange.net",
    ],
    # Render previews + Cloudflare workers.dev previews (CORSMiddleware does
    # not glob inside allow_origins — wildcards require the regex form).
    allow_origin_regex=r"https://.*\.(onrender\.com|workers\.dev)",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)

MAX_DAYS = 750


@app.post("/expected-generation", response_model=ExpectedGenerationResponse)
async def expected_generation(request: ExpectedGenerationRequest):
    """
    Calculate expected AC generation for a solar PV system.

    Accepts project system specs and daily weather data (from the irradiance
    MCP server). Returns total expected kWh with a monthly breakdown including
    cell temperature, POA irradiance, capacity factor, and performance ratio.
    """
    if not request.daily_weather:
        raise HTTPException(status_code=400, detail="daily_weather must contain at least one day")
    if len(request.daily_weather) > MAX_DAYS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_DAYS} days per request (~2 years). Split longer periods.",
        )

    try:
        return calculate_expected_generation(
            project=request.project,
            daily_weather=request.daily_weather,
            weather_source=request.weather_source,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Calculation failed: {exc}") from exc


@app.post("/api/expected-generation", response_model=ExpectedGenerationResponse)
async def site_expected_generation(request: SiteExpectedGenerationRequest):
    """
    Site-level convenience endpoint for the dashboard client: flat project
    specs plus a date range. The service fetches NASA POWER daily weather
    itself, then delegates to the same canonical engine path as
    /expected-generation. Response shape is identical.
    """
    if request.end_date < request.start_date:
        raise HTTPException(status_code=400, detail="end_date must be on/after start_date")
    if (request.end_date - request.start_date).days + 1 > MAX_DAYS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_DAYS} days per request (~2 years). Split longer periods.",
        )

    try:
        daily_weather = await fetch_nasa_power_daily(
            latitude=request.latitude,
            longitude=request.longitude,
            start_date=request.start_date,
            end_date=request.end_date,
        )
    except WeatherFetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    project = ProjectSystemInput(**request.model_dump(exclude={"start_date", "end_date"}))
    try:
        return calculate_expected_generation(
            project=project,
            daily_weather=daily_weather,
            weather_source="nasa_power",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Calculation failed: {exc}") from exc
