import fs from "fs";
import path from "path";
import zlib from "zlib";
import pg from "pg";

const ZIP_PATH = path.resolve("attached_assets/ecoxchange_pvdaq_package_1772767814104.zip");
const SYSTEM_ID = 9068;

function extractFileFromZip(buf: Buffer, filename: string): string | null {
  let offset = 0;
  while (offset < buf.length - 4) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const fnLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const compMethod = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const fname = buf.subarray(offset + 30, offset + 30 + fnLen).toString("utf8");
    const dataStart = offset + 30 + fnLen + extraLen;
    if (fname === filename) {
      const data = buf.subarray(dataStart, dataStart + compSize);
      if (compMethod === 0) return data.toString("utf8");
      if (compMethod === 8) return zlib.inflateRawSync(data).toString("utf8");
    }
    offset = dataStart + compSize;
  }
  return null;
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = values[i]?.trim() ?? "";
    });
    return row;
  });
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Reading zip file...");
  const zipBuf = fs.readFileSync(ZIP_PATH);

  const monthlyCsv = extractFileFromZip(zipBuf, "ecoxchange_pvdaq_package/pvdaq_9068_monthly.csv");
  if (!monthlyCsv) throw new Error("monthly CSV not found in zip");

  const dailyCsv = extractFileFromZip(zipBuf, "ecoxchange_pvdaq_package/pvdaq_9068_daily.csv");
  if (!dailyCsv) throw new Error("daily CSV not found in zip");

  const monthlyRows = parseCsv(monthlyCsv);
  console.log(`Parsed ${monthlyRows.length} monthly rows`);

  const dailyRows = parseCsv(dailyCsv);
  console.log(`Parsed ${dailyRows.length} daily rows`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM pv_monthly_metrics WHERE system_id = $1", [SYSTEM_ID]);
    for (const row of monthlyRows) {
      await client.query(
        `INSERT INTO pv_monthly_metrics (system_id, month, monthly_energy_kwh, avg_power_kw, peak_power_kw, sample_count, days_in_month, capacity_factor, assumed_ppa_usd_per_kwh, estimated_revenue_usd)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          SYSTEM_ID,
          `${row.month}-01`,
          parseFloat(row.monthly_energy_kwh),
          parseFloat(row.avg_power_kw),
          parseFloat(row.peak_power_kw),
          parseInt(row.sample_count),
          parseInt(row.days_in_month),
          parseFloat(row.capacity_factor),
          parseFloat(row.assumed_ppa_usd_per_kwh),
          parseFloat(row.estimated_revenue_usd),
        ]
      );
    }
    console.log(`Inserted ${monthlyRows.length} monthly metrics rows`);

    await client.query("DELETE FROM pv_daily_metrics WHERE system_id = $1", [SYSTEM_ID]);
    for (const row of dailyRows) {
      await client.query(
        `INSERT INTO pv_daily_metrics (system_id, day, daily_energy_kwh, avg_power_kw, peak_power_kw, sample_count, capacity_factor)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          SYSTEM_ID,
          row.date,
          parseFloat(row.daily_energy_kwh),
          parseFloat(row.avg_power_kw),
          parseFloat(row.peak_power_kw),
          parseInt(row.sample_count),
          parseFloat(row.capacity_factor),
        ]
      );
    }
    console.log(`Inserted ${dailyRows.length} daily metrics rows`);

    await client.query("COMMIT");
    console.log("Data load complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("ETL failed:", err);
  process.exit(1);
});
