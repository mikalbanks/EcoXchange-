import { drizzle } from "drizzle-orm/pg-proxy";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// For Replit: use pg-proxy driver with raw Pool
export const db = drizzle(
  async (sql, params, method) => {
    const result = await pool.query(sql, params as unknown[]);
    return { rows: result.rows as unknown[][] };
  },
  { schema }
);

export { pool };
export * from "./schema";
