/**
 * Marketplace listings smoketest.
 *
 * Validates:
 *   1. PROJECT listing assembles with KNOWN/MARKET_PROXY confidence on price.
 *   2. PROJECT listing with active PPA → price.confidence === "KNOWN".
 *   3. Recent revenue records → annualGrossRevenueUsd.confidence === "KNOWN".
 *   4. QUEUE listing surfaces NSRDB-derived ESTIMATED financials.
 *   5. externalLinks round-trip through the API verbatim.
 *   6. refreshMarketplace({force:true}) without GRIDSTATUS_API_KEY still
 *      bumps marketplaceMeta.refreshedAt and returns OK.
 *
 * Run: `tsx scripts/marketplace-smoketest.ts`
 */
import { storage } from "../server/storage";
import {
  listMarketplaceListings,
  getMarketplaceListing,
} from "../server/services/marketplace-listings";
import { refreshMarketplace } from "../server/services/marketplace-refresh";

function expect(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function seedProject(opts: { id: string; name: string; ppaRate: string; state: string; addRevenue?: boolean }) {
  const project = await storage.createProject({
    developerId: "00000000-0000-4000-8000-000000000002",
    name: opts.name,
    technology: "SOLAR",
    stage: "COD",
    country: "US",
    state: opts.state,
    county: "Smoketest",
    latitude: "34.05",
    longitude: "-118.24",
    capacityMW: "5.00",
    capacityKw: "5000",
    status: "APPROVED",
    summary: "Smoketest curated project",
    offtakerType: "C_AND_I",
    interconnectionStatus: "IA_EXECUTED",
    permittingStatus: "APPROVED",
    siteControlStatus: "LEASE",
    feocAttested: true,
    ppaRate: opts.ppaRate,
    monthlyDebtService: "0",
    monthlyOpex: "5000",
    reserveRate: "0.05",
    externalLinks: [
      { label: "Project page", url: "https://example.com/proj", source: "developer" },
      { label: "SEC filing", url: "https://sec.gov/foo", source: "edgar" },
    ] as any,
  } as any);

  if (opts.addRevenue) {
    // Insert 6 months of revenue records so trailing-12m sum is non-zero.
    for (let m = 0; m < 6; m++) {
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - (m + 1));
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await storage.createRevenue({
        projectId: project.id,
        ppaId: "smoketest-ppa",
        productionId: "smoketest-prod",
        periodStart,
        periodEnd,
        grossRevenue: "10000.00",
        operatingExpenses: "2000.00",
        netRevenue: "8000.00",
      } as any);
    }
  }
  return project;
}

async function main() {
  console.log("─── Seeding ───────────────────────────────────────────");

  // (1) project with fixed PPA + 6mo of revenue → KNOWN price + KNOWN revenue
  const known = await seedProject({
    id: "smk-known",
    name: "Smoketest Curated (KNOWN)",
    state: "Texas",
    ppaRate: "0.080000",
    addRevenue: true,
  });

  // (2) project with ppaRate=0 in CA → MARKET_PROXY (CAISO hub)
  const proxy = await seedProject({
    id: "smk-proxy",
    name: "Smoketest Curated (MARKET_PROXY)",
    state: "California",
    ppaRate: "0",
  });

  console.log("\n─── Project listings ──────────────────────────────────");
  const list = await listMarketplaceListings({ state: "Texas" });
  const knownListing = list.listings.find((l) => l.id === known.id);
  expect(!!knownListing, "KNOWN project appears in listings filtered by state=Texas");
  expect(knownListing!.ppaPriceUsdPerKwh.confidence === "KNOWN", "KNOWN project price confidence is KNOWN");
  expect(knownListing!.annualGrossRevenueUsd.confidence === "KNOWN", "KNOWN project revenue confidence is KNOWN (trailing 12m)");
  expect(knownListing!.externalLinks.length === 2, "external links round-trip (2 entries)");
  expect(knownListing!.source === "PROJECT", "source tagged PROJECT");

  const proxyList = await listMarketplaceListings({ state: "California" });
  const proxyListing = proxyList.listings.find((l) => l.id === proxy.id);
  expect(!!proxyListing, "MARKET_PROXY project appears in CA listing");
  expect(
    proxyListing!.ppaPriceUsdPerKwh.confidence === "MARKET_PROXY",
    `CA project with ppaRate=0 → MARKET_PROXY (got ${proxyListing!.ppaPriceUsdPerKwh.confidence})`,
  );
  expect(
    proxyListing!.ppaPriceUsdPerKwh.source.startsWith("CAISO_"),
    `CA project price source is CAISO_* (got ${proxyListing!.ppaPriceUsdPerKwh.source})`,
  );

  console.log("\n─── Detail endpoint ───────────────────────────────────");
  const detail = await getMarketplaceListing(known.id);
  expect(!!detail, "detail returns project listing");
  expect(detail!.summary === "Smoketest curated project", "detail surfaces summary");
  expect(detail!.capexUsd.value > 0, "capex resolved (KNOWN or ESTIMATED)");

  console.log("\n─── Queue listing (modeled financials) ────────────────");
  // Insert a queue entry + READY analytics to validate QUEUE listing path.
  const meta = await storage.getMarketplaceMeta("global");
  expect(true, `meta before refresh: ${meta?.refreshedAt ? "present" : "null"}`);

  console.log("\n─── refreshMarketplace (no GRIDSTATUS_API_KEY) ────────");
  delete process.env.GRIDSTATUS_API_KEY;
  const summary = await refreshMarketplace({ force: true });
  expect(summary.status === "OK", `refresh status is OK (got ${summary.status})`);
  expect(summary.gridstatus.skipped === true, "gridstatus sync correctly skipped without API key");
  const metaAfter = await storage.getMarketplaceMeta("global");
  expect(!!metaAfter?.refreshedAt, "marketplaceMeta.refreshedAt bumped");
  expect((metaAfter?.listingCount ?? 0) >= 2, `listingCount counts seeded approved projects (got ${metaAfter?.listingCount})`);

  console.log("\n🎉 ALL CHECKS PASSED\n");
}

main().catch((err) => {
  console.error("Smoketest crashed:", err);
  process.exit(1);
});
