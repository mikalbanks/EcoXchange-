/**
 * EcoXchange Server
 * =================
 * Express.js + TypeScript backend for the Virtual SCADA pipeline.
 * Digital Securities Platform — Reg D 506(c) compliant.
 */
import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import { pool } from "../db";
import scadaRoutes from "./routes/scada";
import { initWebSocket, broadcastTelemetry } from "./services/websocket";
import { seedDefaultSpv } from "./services/scadaPipeline";

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use("/api", scadaRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", platform: "EcoXchange", version: "1.0.0" });
});

// ─── Static files (production) ──────────────────────────────────────────────
const publicDir = path.join(__dirname, "../../dist/public");
app.use(express.static(publicDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ─── WebSocket ──────────────────────────────────────────────────────────────
initWebSocket(server);

// ─── Database Initialization ────────────────────────────────────────────────
async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS spvs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(256) NOT NULL,
        location VARCHAR(256) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        capacity_kw DOUBLE PRECISION NOT NULL,
        tracking_type VARCHAR(64) NOT NULL DEFAULT 'single_axis',
        ppa_rate_cents_kwh DOUBLE PRECISION NOT NULL,
        reg_d_exemption VARCHAR(32) NOT NULL DEFAULT '506c',
        total_tokens INTEGER NOT NULL DEFAULT 10000,
        token_price_usd DOUBLE PRECISION NOT NULL DEFAULT 100,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS investors (
        id SERIAL PRIMARY KEY,
        email VARCHAR(256) NOT NULL UNIQUE,
        name VARCHAR(256) NOT NULL,
        accredited_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verification_method VARCHAR(128),
        verified_at TIMESTAMP,
        tokens_owned INTEGER NOT NULL DEFAULT 0,
        spv_id INTEGER REFERENCES spvs(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS irradiance_telemetry (
        id SERIAL PRIMARY KEY,
        spv_id INTEGER NOT NULL REFERENCES spvs(id),
        timestamp TIMESTAMP NOT NULL,
        ghi_wm2 DOUBLE PRECISION NOT NULL,
        dni_wm2 DOUBLE PRECISION NOT NULL,
        dhi_wm2 DOUBLE PRECISION NOT NULL,
        solar_zenith_deg DOUBLE PRECISION NOT NULL,
        solar_azimuth_deg DOUBLE PRECISION NOT NULL,
        air_temperature_c DOUBLE PRECISION NOT NULL,
        wind_speed_ms DOUBLE PRECISION NOT NULL,
        cloud_fraction DOUBLE PRECISION,
        source VARCHAR(64) NOT NULL DEFAULT 'nasa_power',
        raw_payload JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_irradiance_spv_ts ON irradiance_telemetry(spv_id, timestamp);

      CREATE TABLE IF NOT EXISTS power_telemetry (
        id SERIAL PRIMARY KEY,
        spv_id INTEGER NOT NULL REFERENCES spvs(id),
        timestamp TIMESTAMP NOT NULL,
        poa_global_wm2 DOUBLE PRECISION NOT NULL,
        cell_temperature_c DOUBLE PRECISION NOT NULL,
        dc_power_kw DOUBLE PRECISION NOT NULL,
        ac_power_kw DOUBLE PRECISION NOT NULL,
        inverter_efficiency DOUBLE PRECISION NOT NULL,
        capacity_factor DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_power_spv_ts ON power_telemetry(spv_id, timestamp);

      CREATE TABLE IF NOT EXISTS yield_ledger (
        id SERIAL PRIMARY KEY,
        spv_id INTEGER NOT NULL REFERENCES spvs(id),
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        period_type VARCHAR(16) NOT NULL,
        energy_kwh DOUBLE PRECISION NOT NULL,
        revenue_usd DOUBLE PRECISION NOT NULL,
        yield_per_token DOUBLE PRECISION NOT NULL,
        avg_capacity_factor DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_yield_spv_period ON yield_ledger(spv_id, period_start);
    `);
    console.log("[DB] Tables initialized successfully.");

    // Seed default SPV
    await seedDefaultSpv();
  } catch (err: any) {
    console.error("[DB] Initialization error:", err.message);
  }
}

// ─── Start Server ───────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3000");

initializeDatabase().then(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  EcoXchange Virtual SCADA Platform                         ║
║  Digital Securities — Reg D 506(c)                         ║
║  Server: http://0.0.0.0:${PORT}                              ║
║  WebSocket: ws://0.0.0.0:${PORT}/ws                          ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
});

export default app;
