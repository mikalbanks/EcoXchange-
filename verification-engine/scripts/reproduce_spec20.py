#!/usr/bin/env python3
"""Repository-root-safe entry point for the Spec 20 public-data reproduction."""
from __future__ import annotations

import sys
from pathlib import Path

ENGINE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ENGINE_ROOT))

from src.spec20_backtest import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())
