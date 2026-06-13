"""FastAPI endpoint tests using the Starlette TestClient."""

from __future__ import annotations

from fastapi.testclient import TestClient

from src.main import app
from tests.fixtures import load_scenario

client = TestClient(app)


def _request_body(name: str = "savannah", year: int = 2023, days: int | None = None) -> dict:
    project, daily = load_scenario(name, year)
    if days is not None:
        daily = daily[:days]
    return {"project": project, "daily_weather": daily}


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "healthy"
    assert "pvlib_version" in body


def test_expected_generation_happy_path():
    resp = client.post("/expected-generation", json=_request_body(days=60))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_expected_kwh"] > 0
    assert len(body["monthly_breakdown"]) >= 1
    assert "model_metadata" in body and "system_summary" in body


def test_empty_daily_weather_returns_400():
    body = _request_body()
    body["daily_weather"] = []
    resp = client.post("/expected-generation", json=body)
    assert resp.status_code == 400


def test_too_many_days_returns_400():
    project, _ = load_scenario("savannah")
    # 760 synthetic days exceeds the 750 cap.
    daily = [
        {"date": f"2023-{(i % 12) + 1:02d}-01", "ghi_kwh_m2": 5.0, "dni_kwh_m2": 5.5, "dhi_kwh_m2": 1.2}
        for i in range(760)
    ]
    resp = client.post("/expected-generation", json={"project": project, "daily_weather": daily})
    assert resp.status_code == 400


def test_invalid_project_returns_422():
    body = _request_body(days=10)
    body["project"]["capacity_kw_dc"] = 0  # violates gt=0
    resp = client.post("/expected-generation", json=body)
    assert resp.status_code == 422


def test_invalid_latitude_returns_422():
    body = _request_body(days=10)
    body["project"]["latitude"] = 200  # out of [-90, 90]
    resp = client.post("/expected-generation", json=body)
    assert resp.status_code == 422
