from fastapi import APIRouter

import pvlib

from .config import ENGINE_NAME, ENGINE_VERSION

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": ENGINE_NAME,
        "version": ENGINE_VERSION,
        "pvlib_version": pvlib.__version__,
    }
