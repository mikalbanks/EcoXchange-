import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("Spec 06 project-finance UX contracts", () => {
  const page = read("client/src/pages/developer/project-finance-underwriting.tsx");
  const app = read("client/src/App.tsx");
  const server = read("server/index.ts");

  it("routes the protected developer underwriting workspace", () => {
    expect(app).toContain('path="/developer/project-finance"');
    expect(app).toContain("ProjectFinanceUnderwriting");
  });

  it("uses the server preview API rather than implementing finance formulas in React", () => {
    expect(page).toContain('apiRequest("POST", "/api/v1/calculations/preview"');
    expect(page).not.toContain("8760");
    expect(page).not.toContain("cfads /");
    expect(page).not.toContain("Math.min(");
  });

  it("makes fact and assumption provenance visible", () => {
    expect(page).toContain("SourceBadge");
    expect(page).toContain('"FACT"');
    expect(page).toContain('"ASSUMPTION"');
    expect(page).toContain('"CUSTOM"');
  });

  it("labels the initial workflow as non-persistent and indicative", () => {
    expect(page).toContain("Preview · not persisted");
    expect(page).toContain("Indicative permanent debt");
    expect(page).toContain("not a financing commitment");
  });

  it("mounts only the non-persistent project-finance API surface", () => {
    expect(server).toContain("registerProjectFinanceApi");
    expect(server).toContain("Spec 04 database migrations remain under staging validation");
  });
});
