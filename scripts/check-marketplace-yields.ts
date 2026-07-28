/**
 * Prints every marketplace listing's underwriting so the yield can be checked by
 * hand rather than trusted. Run with: npx tsx scripts/check-marketplace-yields.ts
 */
import { listMarketplaceListings } from "../server/services/marketplace-listings";
import { CASH_YIELD_HURDLE_PCT } from "../server/lib/project-economics";

async function main() {
  const r = await listMarketplaceListings({ limit: 100 });
  const rows = r.listings.map((l) => ({
    name: l.name.slice(0, 34),
    src: l.source,
    stage: l.stage ?? "",
    MW: Number(l.capacityMW.toFixed(1)),
    "CF%": Number(l.capacityFactorPct.value.toFixed(1)),
    "$/kWh": Number(l.ppaPriceUsdPerKwh.value.toFixed(4)),
    "rev$k": Math.round(l.annualGrossRevenueUsd.value / 1000),
    "equity$k": Math.round(l.investorEquityUsd.value / 1000),
    "cash$k": Math.round(l.annualInvestorYieldUsd.value / 1000),
    "unlev%": Number(l.unleveredCashYieldPct.value.toFixed(2)),
    "EQUITY%": Number(l.cashYieldOnEquityPct.value.toFixed(2)),
    DSCR: Number.isFinite(l.dscrX.value) && l.dscrX.value > 0
      ? Number(l.dscrX.value.toFixed(2))
      : "unlev",
  }));
  rows.sort((a, b) => b["EQUITY%"] - a["EQUITY%"]);
  console.table(rows);
  const clearing = rows.filter((x) => x["EQUITY%"] >= CASH_YIELD_HURDLE_PCT).length;
  console.log(`\n${clearing}/${rows.length} listings clear the ${CASH_YIELD_HURDLE_PCT}% cash-yield hurdle.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
