from fastapi import APIRouter

import pvlib

from .config import ENGINE_NAME, ENGINE_VERSION, TRANSPOSITION_MODEL

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": ENGINE_NAME,
        "version": ENGINE_VERSION,
        # Alias kept for external clients (dashboard EngineHealth chip).
        "engine_version": ENGINE_VERSION,
        "model": "pvlib ModelChain",
        "transposition": TRANSPOSITION_MODEL,
        "pvlib_version": pvlib.__version__,
    }
