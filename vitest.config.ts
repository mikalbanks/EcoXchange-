import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Root test runner.
 *
 * Scoped to `server/` and `shared/` on purpose: every sub-package in this repo
 * (`ecoxchange-dashboard`, `ecoxchange-reconciliation-engine`,
 * `ecoxchange-onboarding`, `ecoxchange-mcp`) ships its own vitest config and
 * runs its own suite. Widening the include here would pull those in twice.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  test: {
    include: [
      "server/**/*.test.ts",
      "shared/**/*.test.ts",
      "client/src/components/evidence/**/*.test.ts",
      "client/src/components/evidence/**/*.test.tsx",
    ],
    environment: "node",
    // The distribution engine's property tests run 10,000 randomised
    // allocations (Spec 17 AC 2), which is comfortably inside this.
    testTimeout: 60_000,
  },
});
