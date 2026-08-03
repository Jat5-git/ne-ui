// Every DB access that reads or writes a tenant-scoped row goes through here.
// It borrows a pooled client, sets the tenant_id session variable (which the
// row-level-security policies read), runs the callback inside a transaction,
// and releases the client. If the callback throws, the tx is rolled back and
// the tenant_id session variable disappears with the connection release.

import { pool } from "./client.js";

/**
 * Run a callback inside a transaction with `app.tenant_id` set to the given
 * tenant. All tenant-scoped tables enforce tenant_id via RLS policy.
 *
 * @param {string} tenantId
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTenant(tenantId, fn) {
  if (!tenantId) throw new Error("withTenant: tenantId required");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // set_config is safer than SET LOCAL — it accepts parameters and prevents SQL injection.
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Read-only helper for hot GET endpoints — same tenant scoping, no explicit tx.
export async function withTenantRO(tenantId, fn) {
  const client = await pool.connect();
  try {
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    return await fn(client);
  } finally {
    client.release();
  }
}
