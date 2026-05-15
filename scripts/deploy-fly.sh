#!/usr/bin/env bash
#
# One-shot deploy script for the EcoXchange API to Fly.io.
#
# Prereqs (one-time):
#   1. brew install flyctl      # or: curl -L https://fly.io/install.sh | sh
#   2. fly auth login           # opens a browser, signs you in
#
# Usage:
#   ./scripts/deploy-fly.sh
#
# You'll be prompted for:
#   - Your Supabase database password (won't echo to screen)
#   - Optional API keys (Solcast, NREL, EIA, Persona, OpenAI, GridStatus)

set -euo pipefail

APP_NAME="ecoxchange-api"
SUPABASE_POOLED_HOST="aws-1-us-east-2.pooler.supabase.com"
SUPABASE_POOLED_USER="postgres.uwhohywjlkqujsyqgzll"

echo "==> Checking flyctl is installed and authenticated..."
if ! command -v fly >/dev/null 2>&1; then
  echo "ERROR: flyctl is not installed."
  echo "Install it with: brew install flyctl   (or: curl -L https://fly.io/install.sh | sh)"
  exit 1
fi
if ! fly auth whoami >/dev/null 2>&1; then
  echo "ERROR: you're not logged in to Fly. Run: fly auth login"
  exit 1
fi
echo "    Logged in as: $(fly auth whoami)"

echo "==> Reading secrets..."
read -rsp "Supabase DB password: " DB_PASSWORD
echo
if [[ -z "$DB_PASSWORD" ]]; then
  echo "ERROR: DB password is required."
  exit 1
fi

read -rp "SOLCAST_API_KEY (blank to skip): " SOLCAST_API_KEY
read -rp "NREL_API_KEY (blank to skip): " NREL_API_KEY
read -rp "EIA_API_KEY (blank to skip): " EIA_API_KEY
read -rp "PERSONA_API_KEY (blank to skip): " PERSONA_API_KEY
read -rp "PERSONA_TEMPLATE_ID (blank to skip): " PERSONA_TEMPLATE_ID
read -rp "PERSONA_WEBHOOK_SECRET (blank to skip): " PERSONA_WEBHOOK_SECRET
read -rp "AI_INTEGRATIONS_OPENAI_API_KEY (blank to skip): " OPENAI_KEY
read -rp "GRIDSTATUS_API_KEY (blank to skip): " GRIDSTATUS_API_KEY

DATABASE_URL="postgresql://${SUPABASE_POOLED_USER}:${DB_PASSWORD}@${SUPABASE_POOLED_HOST}:6543/postgres?pgbouncer=true"
SESSION_SECRET="$(openssl rand -hex 32)"

echo "==> Checking if Fly app '$APP_NAME' exists..."
if fly apps list 2>/dev/null | grep -q "^${APP_NAME}\b"; then
  echo "    App exists. Skipping fly launch."
else
  echo "    Creating app with fly launch..."
  fly launch --no-deploy --copy-config --name "$APP_NAME" --yes
fi

echo "==> Setting Fly secrets..."
SECRET_ARGS=(
  "DATABASE_URL=${DATABASE_URL}"
  "SESSION_SECRET=${SESSION_SECRET}"
  "MARKETPLACE_REFRESH_ON_BOOT=1"
)
[[ -n "$SOLCAST_API_KEY" ]] && SECRET_ARGS+=("SOLCAST_API_KEY=${SOLCAST_API_KEY}")
[[ -n "$NREL_API_KEY" ]] && SECRET_ARGS+=("NREL_API_KEY=${NREL_API_KEY}")
[[ -n "$EIA_API_KEY" ]] && SECRET_ARGS+=("EIA_API_KEY=${EIA_API_KEY}")
[[ -n "$PERSONA_API_KEY" ]] && SECRET_ARGS+=("PERSONA_API_KEY=${PERSONA_API_KEY}")
[[ -n "$PERSONA_TEMPLATE_ID" ]] && SECRET_ARGS+=("PERSONA_TEMPLATE_ID=${PERSONA_TEMPLATE_ID}")
[[ -n "$PERSONA_WEBHOOK_SECRET" ]] && SECRET_ARGS+=("PERSONA_WEBHOOK_SECRET=${PERSONA_WEBHOOK_SECRET}")
[[ -n "$OPENAI_KEY" ]] && SECRET_ARGS+=("AI_INTEGRATIONS_OPENAI_API_KEY=${OPENAI_KEY}" "AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1")
[[ -n "$GRIDSTATUS_API_KEY" ]] && SECRET_ARGS+=("GRIDSTATUS_API_KEY=${GRIDSTATUS_API_KEY}")

fly secrets set --app "$APP_NAME" --stage "${SECRET_ARGS[@]}"

echo "==> Deploying..."
fly deploy --app "$APP_NAME"

echo "==> Healthcheck..."
sleep 5
APP_URL="https://${APP_NAME}.fly.dev"
if curl -fsS "${APP_URL}/api/health" | grep -q '"ok":true'; then
  echo "    OK: ${APP_URL}/api/health responded"
else
  echo "    WARN: healthcheck did not return ok. Check: fly logs --app ${APP_NAME}"
fi

cat <<EOF

============================================================
Done. Your API is at: ${APP_URL}

Final step (Cloudflare side, not in this script):

  wrangler secret put API_ORIGIN
  # paste: ${APP_URL}

Then verify end-to-end:
  curl https://<your-cloudflare-host>/api/public/market/projects
============================================================
EOF
