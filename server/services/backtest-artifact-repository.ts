import type { BacktestReport } from "./backtest-engine";

export interface BacktestArtifactRepository {
  get(resultId: string): Promise<BacktestReport | null>;
  getLatest(): Promise<BacktestReport | null>;
  save(report: BacktestReport): Promise<void>;
}

class MemoryBacktestArtifactRepository implements BacktestArtifactRepository {
  private readonly reports = new Map<string, BacktestReport>();

  async get(resultId: string) {
    return this.reports.get(resultId) ?? null;
  }

  async getLatest() {
    return Array.from(this.reports.values()).at(-1) ?? null;
  }

  async save(report: BacktestReport) {
    if (this.reports.has(report.resultId)) return;
    this.reports.set(report.resultId, structuredClone(report));
  }
}

class PostgresBacktestArtifactRepository implements BacktestArtifactRepository {
  async get(resultId: string): Promise<BacktestReport | null> {
    const { pool } = await import("../db");
    const result = await pool.query<{ report: BacktestReport }>(
      "select report from pilot_backtest_artifacts where result_id = $1",
      [resultId],
    );
    return result.rows[0]?.report ?? null;
  }

  async getLatest(): Promise<BacktestReport | null> {
    const { pool } = await import("../db");
    const result = await pool.query<{ report: BacktestReport }>(
      "select report from pilot_backtest_artifacts order by generated_at desc, result_id desc limit 1",
    );
    return result.rows[0]?.report ?? null;
  }

  async save(report: BacktestReport): Promise<void> {
    const { pool } = await import("../db");
    await pool.query(
      `insert into pilot_backtest_artifacts
         (result_id, site_id, generated_at, engine_version, report)
       values ($1, $2, $3, $4, $5::jsonb)
       on conflict (result_id) do nothing`,
      [
        report.resultId,
        report.site.siteId,
        report.generatedAt,
        report.engineVersion,
        JSON.stringify(report),
      ],
    );
  }
}

const repository: BacktestArtifactRepository = process.env.DATABASE_URL
  ? new PostgresBacktestArtifactRepository()
  : new MemoryBacktestArtifactRepository();

export function getBacktestArtifactRepository(): BacktestArtifactRepository {
  return repository;
}
