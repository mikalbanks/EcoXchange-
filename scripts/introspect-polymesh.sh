#!/usr/bin/env bash
#
# Spec 18 § 2.3 — schema discovery is a build step, not an assumption.
#
# `docs/polymesh-middleware-schema.graphql` is the schema the queries in
# `ecoxchange-reconciliation-engine/src/polymesh/queries.ts` were written
# against. It was taken from the indexer's own source of truth —
# PolymeshAssociation/polymesh-subquery@master, v19.6.0 — rather than from a
# live introspection, because the environment the integration was built in
# could not reach *.polymath.network.
#
# That substitution is fine for writing correct field names; it is NOT proof
# that the deployed middleware runs that version. Run this script and diff
# before pointing anything at mainnet, and again after any chain upgrade.
#
# Usage:
#   scripts/introspect-polymesh.sh [testnet|mainnet] [outfile]
#
set -euo pipefail

NETWORK="${1:-testnet}"
OUTFILE="${2:-/tmp/polymesh-introspection-${NETWORK}.json}"

case "$NETWORK" in
  testnet) ENDPOINT="https://testnet-graphqlnative.polymath.network/" ;;
  mainnet) ENDPOINT="https://mainnet-graphqlnative.polymath.network/" ;;
  *) echo "unknown network '$NETWORK' (expected testnet|mainnet)" >&2; exit 2 ;;
esac

echo "Introspecting $NETWORK: $ENDPOINT"

# The full type map, not just query fields — the committed snapshot describes
# entity types, so a query-field-only introspection would not be comparable.
curl -sS --fail --max-time 60 "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name kind fields { name type { name kind ofType { name kind } } } } } }"}' \
  -o "$OUTFILE"

echo "Wrote $OUTFILE"
echo
echo "Now confirm the entities Spec 18 depends on are present and unchanged:"
for t in Asset AssetHolder Distribution DistributionPayment Block Event Identity; do
  if grep -q "\"name\":\"$t\"" "$OUTFILE"; then
    echo "  ok       $t"
  else
    echo "  MISSING  $t   <- queries.ts will break"
  fi
done
echo
echo "Committed snapshot: docs/polymesh-middleware-schema.graphql (subquery v19.6.0)"
echo "If field names have moved, update queries.ts and models.ts before syncing."
