// Neon Postgres connection with two drivers:
//   1. `sql`  → serverless HTTPS (per-request, ideal for Vercel/Cloudflare/serverless routes)
//   2. `pool` → node-postgres over Neon's pooler endpoint, for long-lived worker processes
//              and any code path that needs a transaction with SET LOCAL.
//
// Why two? Neon's serverless driver uses HTTP for one-shot queries — extremely low-latency,
// zero cold-connection cost. But it cannot hold a session (transactions/SET LOCAL/LISTEN),
// which we need for tenant context via `SET LOCAL app.tenant_id`.
// For those flows we borrow a client from a pgBouncer-fronted `Pool`.

import "dotenv/config";
import { neon, neonConfig } from "@neondatabase/serverless";
import pg from "pg";
import ws from "ws";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
if (!process.env.DATABASE_POOL_URL) throw new Error("DATABASE_POOL_URL not set");

// Enable WebSocket transport when running in Node (Neon serverless prefers HTTP for one-shots
// but WS is needed if you ever want to run interactive transactions via the serverless driver).
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

// -------- 1. HTTPS one-shot driver (no session) --------
export const sql = neon(process.env.DATABASE_URL);

// -------- 2. Pooled TCP driver (session/transactions) --------
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_POOL_URL,
  ssl: { rejectUnauthorized: false },
  // Neon's pooler will multiplex; keep app-side pool small so we don't exhaust it.
  max: parseInt(process.env.DB_POOL_MAX || "10", 10),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[pg pool] unexpected error", err);
});

// Graceful shutdown
export async function closePool() {
  await pool.end();
}
