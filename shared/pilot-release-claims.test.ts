import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

const publicClaimFiles = [
  "APP.md",
  "client/index.html",
  "client/src/pages/landing.tsx",
  "client/src/pages/develop.tsx",
  "client/src/pages/method.tsx",
  "client/src/pages/faq.tsx",
  "client/src/pages/market.tsx",
  "client/src/pages/market-project.tsx",
  "client/src/components/developer-submission-wizard.tsx",
  "client/src/components/investor-onboarding-wizard.tsx",
  "ecoxchange-dashboard/src/pages/Landing.tsx",
  "ecoxchange-dashboard/src/pages/OnboardingWizard.tsx",
  "ecoxchange-dashboard/src/compliance/config/bannerConfig.ts",
  "ecoxchange-dashboard/src/compliance/config/disclaimerConfig.ts",
  "ecoxchange-dashboard/src/components/loi/LOIDocument.tsx",
] as const;

const prohibitedClaims = [
  /administers private placements/i,
  /underwrites equity raises/i,
  /target intake-to-live/i,
  /\b2[–-]4 weeks\b/i,
  /under 24 hours/i,
  /55[–-]65% lower/i,
  /we handle the rest/i,
  /all data displayed is simulated/i,
  /payment proceeds only after verification/i,
  /72-hour target/i,
  /3% origination/i,
  /\$15,000 setup/i,
  /0\.5% AUA/i,
  /production-verified yield/i,
  /three independent sources/i,
  /before any distribution is released/i,
] as const;

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, `file://${repoRoot}`), "utf8");
}

describe("Release 1 public claims", () => {
  it("contains none of the superseded operating, timing, or pricing claims", () => {
    const violations: string[] = [];

    for (const file of publicClaimFiles) {
      const source = read(file);
      for (const pattern of prohibitedClaims) {
        if (pattern.test(source)) violations.push(`${file}: ${pattern.source}`);
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("states the public pilot boundary in both product surfaces", () => {
    expect(read("client/src/pages/landing.tsx")).toContain(
      "does not accept investments, execute payments",
    );
    expect(read("ecoxchange-dashboard/src/pages/Landing.tsx")).toContain(
      "no project ownership, account, or",
    );
  });
});

describe("Release 1 deployment ownership", () => {
  it("assigns the investor-demo hostname to exactly one Cloudflare Worker", () => {
    const configs = [
      "ecoxchange-dashboard/wrangler.jsonc",
      "ecoxchange-demo/wrangler.jsonc",
    ];
    const owners = configs.filter((file) =>
      /"pattern"\s*:\s*"demo\.ecoxchange\.net"/.test(read(file)),
    );

    expect(owners).toEqual(["ecoxchange-dashboard/wrangler.jsonc"]);
  });
});

describe("Release 1 pilot security gates", () => {
  const routes = read("server/routes.ts");

  it("fails identity verification closed when Persona is unavailable", () => {
    expect(routes).not.toMatch(/personaStatus:\s*"completed"[\s\S]{0,180}demo mode/i);
    expect(routes).toContain("Webhook verification is not configured");
    expect(routes).toContain("crypto.timingSafeEqual");
  });

  it("does not expose backtest execution on the public route", () => {
    expect(routes).toMatch(
      /post\("\/api\/public\/backtest\/run"[\s\S]{0,220}status\(410\)/,
    );
    expect(routes).toMatch(
      /post\("\/api\/admin\/backtest\/run", requireRole\("ADMIN"\), backtestRunLimiter/,
    );
  });

  it("stores immutable reports and discloses scored coverage", () => {
    expect(read("migrations/0010_pilot_backtest_artifacts.sql")).toContain(
      "pilot_backtest_artifacts_append_only",
    );
    expect(read("server/services/backtest-engine.ts")).toContain(
      "Missing provider observations are unknown, not zero production",
    );
  });
});

describe("Release 1 route gates", () => {
  const app = read("ecoxchange-dashboard/src/App.tsx");
  const rootApp = read("client/src/App.tsx");
  const transactionRoutes = [
    "/investor/marketplace",
    "/investor/offering/:slug",
    "/investor/calculator",
    "/investor/distributions",
    "/distribute",
    "/investor/project/:id/yields",
    "/investor/project/:id/documents",
    "/investor/project/:id/chain",
    "/explorer",
    "/developer/loi",
  ];

  it("wraps every unfinished financial, ownership, and legal route", () => {
    for (const route of transactionRoutes) {
      const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(app).toMatch(
        new RegExp(`path=["']${escaped}["'][\\s\\S]{0,700}<PilotTransactionGate`),
      );
    }
  });

  it("keeps the unrelated multi-project fixture outside the Release 1 path", () => {
    expect(app).toMatch(
      /path=["']\/projects["'][\s\S]{0,500}<ReleaseOneBoundary/,
    );
  });

  it("fails closed on the legacy app's unfinished transaction routes", () => {
    const routes = [
      "/yield-simulation",
      "/developer/projects/new",
      "/investor/deals",
      "/investor/deals/:id",
      "/investor/interests",
    ];

    for (const route of routes) {
      const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(rootApp).toMatch(
        new RegExp(`path=["']${escaped}["'][\\s\\S]{0,350}<PilotTransactionBoundary`),
      );
    }
  });
});
