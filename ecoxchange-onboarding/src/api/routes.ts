import { Router, type Request, type Response } from "express";
import axios from "axios";
import { ZodError } from "zod";
import {
  SubmissionSchema,
  VerifyCredentialsSchema,
} from "../utils/validation.js";
import { encrypt } from "../crypto/secret.js";
import {
  getSubmission,
  insertSubmission,
} from "../db/submissions.js";
import {
  createSignedReportUrl,
  getReportBySubmission,
} from "../db/reports.js";
import { getSupabase } from "../db/client.js";

const router = Router();

const SOLAR_PLANT_URL =
  process.env.SOLAR_PLANT_MCP_URL ?? "http://localhost:3001/mcp";

router.post("/submit", async (req: Request, res: Response) => {
  try {
    const parsed = SubmissionSchema.parse(req.body);
    const hasCreds = Boolean(parsed.inverter_api_key && parsed.inverter_plant_id);
    const row = {
      ...parsed,
      has_inverter_creds: hasCreds,
      inverter_api_key: parsed.inverter_api_key
        ? encrypt(parsed.inverter_api_key)
        : null,
      status: "submitted" as const,
      status_history: [
        { status: "submitted" as const, ts: new Date().toISOString(), note: null },
      ],
    };
    const inserted = await insertSubmission(row);
    res.json({ submission_id: inserted.id, status: inserted.status });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "ValidationError", details: err.errors });
      return;
    }
    res
      .status(500)
      .json({ error: "SubmitFailed", message: (err as Error).message });
  }
});

router.get("/status/:id", async (req: Request, res: Response) => {
  try {
    const sub = await getSubmission(req.params.id);
    if (!sub) {
      res.status(404).json({ error: "NotFound" });
      return;
    }
    res.json({
      submission_id: sub.id,
      status: sub.status,
      status_history: sub.status_history,
      updated_at: sub.updated_at,
      notes: sub.notes,
      backtest_report_id: sub.backtest_report_id,
      project_id: sub.project_id,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "StatusFailed", message: (err as Error).message });
  }
});

router.get("/report/:id", async (req: Request, res: Response) => {
  try {
    const sub = await getSubmission(req.params.id);
    if (!sub) {
      res.status(404).json({ error: "NotFound" });
      return;
    }
    const report = await getReportBySubmission(req.params.id);
    if (!report) {
      res.status(409).json({ error: "ReportNotReady", status: sub.status });
      return;
    }
    // Fetch the JSON blob via signed URL and inline it for convenience.
    const signedUrl = await createSignedReportUrl(report.report_json_path);
    const blob = await axios.get(signedUrl, { responseType: "json" });
    res.json({
      submission_id: req.params.id,
      report_meta: {
        id: report.id,
        generated_at: report.generated_at,
        engine_version: report.engine_version,
        irradiance_source: report.irradiance_source,
        has_real_inverter_data: report.has_real_inverter_data,
        json_signed_url: signedUrl,
      },
      report: blob.data,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "ReportFailed", message: (err as Error).message });
  }
});

router.post("/verify-credentials", async (req: Request, res: Response) => {
  try {
    const parsed = VerifyCredentialsSchema.parse(req.body);
    const body = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "plant_check_credentials",
        arguments: parsed,
      },
    };
    const mcpResp = await axios.post(SOLAR_PLANT_URL, body, {
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      timeout: 30_000,
    });
    const text = mcpResp.data?.result?.content?.[0]?.text;
    if (!text) {
      res
        .status(502)
        .json({ error: "McpEmptyResponse", upstream: mcpResp.data });
      return;
    }
    res.json(JSON.parse(text));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "ValidationError", details: err.errors });
      return;
    }
    res
      .status(500)
      .json({ error: "VerifyFailed", message: (err as Error).message });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "ecoxchange-onboarding" });
});

// Light "ping" to confirm Supabase connectivity at boot time.
router.get("/ping-db", async (_req: Request, res: Response) => {
  try {
    const { error } = await getSupabase()
      .from("developer_submissions")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    res.json({ status: "ok" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "DbDown", message: (err as Error).message });
  }
});

export default router;
