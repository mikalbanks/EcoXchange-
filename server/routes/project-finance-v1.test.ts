import { describe, expect, it } from "vitest";
import {
  analyzeBodySchema,
  projectCreateSchema,
  scenarioAssumptionsSchema,
} from "../services/project-finance-engine/api-v1-contracts";
import { projectFinanceHttpStatus, registerProjectFinanceV1Routes } from "./project-finance-v1";

function captureRoutes() {
  const routes: Array<{ method: string; path: string }> = [];
  const app: any = {};
  for (const method of ["get","post","put","patch","delete"]) app[method] = (path: string, _handler: unknown) => { routes.push({ method: method.toUpperCase(), path }); };
  registerProjectFinanceV1Routes(app, {
    service: {} as any,
    resolveContext: async () => ({ organizationId: "00000000-0000-0000-0000-000000000001", actorUserId: "user-1" }),
  });
  return routes;
}

describe("Ticket 13 /api/v1 contracts", () => {
  it("registers the authoritative calculate, underwrite, analyze and history boundaries", () => {
    const routes = captureRoutes();
    expect(routes).toEqual(expect.arrayContaining([
      { method: "POST", path: "/api/v1/scenarios/:scenarioId/calculate" },
      { method: "POST", path: "/api/v1/calculation-runs/:runId/underwrite" },
      { method: "POST", path: "/api/v1/scenarios/:scenarioId/analyze" },
      { method: "GET", path: "/api/v1/calculation-runs/:runId" },
      { method: "GET", path: "/api/v1/underwriting-runs/:runId" },
      { method: "GET", path: "/api/v1/scenarios/:scenarioId/resolved-input" },
      { method: "GET", path: "/api/v1/projects/:projectId/scenario-comparison" },
    ]));
  });

  it("does not expose mutation or delete routes for immutable calculation/underwriting history", () => {
    const routes = captureRoutes();
    expect(routes.some(r => ["PATCH","PUT","DELETE"].includes(r.method) && /calculation-runs|underwriting-runs/.test(r.path))).toBe(false);
  });

  it("keeps organization identity out of project creation payloads", () => {
    expect(projectCreateSchema.safeParse({ name: "Five MW", technology: "SOLAR_PV", organization_id: "00000000-0000-0000-0000-000000000999" }).success).toBe(false);
    expect(projectCreateSchema.safeParse({ name: "Five MW", technology: "SOLAR_PV", country_code: "US" }).success).toBe(true);
  });

  it("uses decimal rate conventions without guessing percentage points", () => {
    const parsed = scenarioAssumptionsSchema.parse({ assumptions: [{ field_key: "revenue.ppa_escalation_rate", value: 0.01, unit: "PERCENT_DECIMAL" }] });
    expect(parsed.assumptions[0].value).toBe(0.01);
    // API shape validation intentionally does not transform 30 -> .30; Ticket 10/02 domain validation owns numeric validity.
    const thirty = scenarioAssumptionsSchema.parse({ assumptions: [{ field_key: "tax_credit.itc_rate", value: 30, unit: "PERCENT_DECIMAL" }] });
    expect(thirty.assumptions[0].value).toBe(30);
  });

  it("accepts explicit policy selectors and rejects unknown analyze properties", () => {
    expect(analyzeBodySchema.safeParse({ policy_code: "ECOXCHANGE_SOLAR_BASE", policy_version: "0.1.0" }).success).toBe(true);
    expect(analyzeBodySchema.safeParse({ policy_code: "ECOXCHANGE_SOLAR_BASE", finance_result: { permanent_debt: 1 } }).success).toBe(false);
  });

  it("maps domain failures centrally without treating credit conclusions as HTTP errors", () => {
    expect(projectFinanceHttpStatus("CALCULATION_INPUT_INCOMPLETE")).toBe(422);
    expect(projectFinanceHttpStatus("POLICY_CALCULATION_MISMATCH")).toBe(409);
    expect(projectFinanceHttpStatus("IDEMPOTENCY_KEY_CONFLICT")).toBe(409);
    expect(projectFinanceHttpStatus("PROJECT_NOT_FOUND")).toBe(404);
    // PASS/FAIL/INSUFFICIENT_INFORMATION are response data, not error codes; only service errors enter this mapper.
  });

  it("keeps fact, scenario, override and policy discovery endpoints versioned", () => {
    const routes = captureRoutes();
    expect(routes.every(r => r.path.startsWith("/api/v1/"))).toBe(true);
    expect(routes).toEqual(expect.arrayContaining([
      { method: "POST", path: "/api/v1/projects/:projectId/facts" },
      { method: "POST", path: "/api/v1/projects/:projectId/facts/:factId/supersede" },
      { method: "PUT", path: "/api/v1/scenarios/:scenarioId/assumptions" },
      { method: "POST", path: "/api/v1/scenarios/:scenarioId/policy-overrides" },
      { method: "GET", path: "/api/v1/underwriting-policies" },
    ]));
  });
});
