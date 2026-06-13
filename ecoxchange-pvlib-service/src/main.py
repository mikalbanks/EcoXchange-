from fastapi import FastAPI, HTTPException

from .config import ENGINE_VERSION
from .health import router as health_router
from .models import ExpectedGenerationRequest, ExpectedGenerationResponse
from .pvlib_runner import calculate_expected_generation

app = FastAPI(
    title="EcoXchange pvlib Expected Generation Service",
    version=ENGINE_VERSION,
    description="Calculates expected solar PV generation using pvlib ModelChain.",
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
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Calculation failed: {exc}") from exc
