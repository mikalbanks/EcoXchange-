#!/usr/bin/env bash
#
# End-to-end demo driver for the EcoXchange integration pipeline.
#
# Authenticates as a developer, runs a streaming backtest for a sample project
# (intake -> NASA POWER -> pvlib -> reconciliation -> SSE -> optional Supabase),
# then reads the persisted verification history back.
#
# Usage:
#   scripts/run-demo.sh                       # dev server, http://localhost:5000
#   BASE_URL=http://localhost:8080 scripts/run-demo.sh   # docker-compose
#
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
COOKIES="$(mktemp)"
trap 'rm -f "$COOKIES"' EXIT

# Load .env if present (so SUPABASE_* / service URLs are visible to this shell).
if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

echo "=== EcoXchange End-to-End Demo ==="
echo "Base URL: $BASE_URL"
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "NOTE: Supabase env not set — running in-memory only (no DB writes)."
fi
echo ""

# 1. Wait for the API to report healthy downstream services.
echo "Waiting for $BASE_URL/api/health ..."
for i in $(seq 1 30); do
  if HEALTH="$(curl -sf "$BASE_URL/api/health" 2>/dev/null)"; then
    echo "  health: $HEALTH"
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    echo "  ✗ API did not become healthy in time" >&2
    exit 1
  fi
done
echo ""

# 2. Authenticate as a DEVELOPER (the backtest route is role-guarded).
EMAIL="demo+$(date +%s)@ecoxchange.net"
echo "Signing up demo developer ($EMAIL)..."
curl -sf -c "$COOKIES" -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"demo-password\",\"role\":\"DEVELOPER\"}" \
  > /dev/null
echo "  ✓ authenticated"
echo ""

# 3. Stream the backtest for the Savannah 5MW reference project.
echo "Running backtest (SSE) for Savannah Community Solar 5MW..."
RESPONSE="$(curl -sN -b "$COOKIES" -X POST "$BASE_URL/api/developer/backtest" \
  -H "Content-Type: application/json" \
  -d '{
    "project": {
      "name": "Savannah Community Solar 5MW (demo)",
      "latitude": 32.08,
      "longitude": -81.09,
      "timezone": "America/New_York",
      "capacity_kw_dc": 5000,
      "tilt_deg": 20,
      "azimuth_deg": 180,
      "module_type": "monocrystalline",
      "module_efficiency": 0.20,
      "racking_type": "open_rack",
      "dc_ac_ratio": 1.2,
      "commissioning_date": "2023-01-01",
      "inverter_brand": "solaredge",
      "has_monitoring_access": false,
      "offtake_type": "community_solar",
      "ppa_rate_per_kwh": 0.08,
      "ppa_escalator": 0.02
    },
    "backtest_months": 12
  }')"

# Echo streamed frames, then extract the completed payload's project_id.
echo "$RESPONSE" | sed -n 's/^data: /  · /p' | tail -20
PROJECT_ID="$(echo "$RESPONSE" | sed -n 's/^data: //p' | grep -o '"project_id":"[^"]*"' | tail -1 | cut -d'"' -f4)"
echo ""
echo "  project_id: ${PROJECT_ID:-<none>}"
echo ""

# 4. Read persisted verification history (proves the Supabase round-trip).
if [ -n "${PROJECT_ID:-}" ]; then
  echo "Fetching persisted verification history..."
  curl -sf -b "$COOKIES" \
    "$BASE_URL/api/developer/projects/$PROJECT_ID/verification-history" \
  | sed 's/^/  /'
  echo ""
fi

echo "=== Demo complete. Open $BASE_URL (or http://localhost:5173 in dev) ==="
