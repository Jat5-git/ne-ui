import bcrypt from "bcryptjs";
import { z } from "zod";
import { ulid } from "ulid";
import { sql } from "../db/client.js";
import { signToken } from "../middleware/auth.js";
import { badRequest, conflict } from "../middleware/error.js";

// ---- signup: creates tenant + owner user together ----
const signupSchema = z.object({
  workspace_name: z.string().min(2),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signup(req, res) {
  const b = signupSchema.parse(req.body);
  const existing = await sql`SELECT id FROM tenants WHERE slug = ${b.slug}`;
  if (existing.length) throw conflict("slug_taken", "workspace slug already exists");

  const tenantId = `t_${ulid()}`;
  const userId = `u_${ulid()}`;
  const hash = await bcrypt.hash(b.password, 12);

  // Neon HTTP driver auto-transactions this batch
  await sql.transaction([
    sql`INSERT INTO tenants (id, name, slug) VALUES (${tenantId}, ${b.workspace_name}, ${b.slug})`,
    sql`INSERT INTO users (id, tenant_id, email, password_hash, name, role)
        VALUES (${userId}, ${tenantId}, ${b.email}, ${hash}, ${b.name}, 'owner')`,
  ]);

  const token = signToken({ user_id: userId, tenant_id: tenantId, role: "owner" });
  res.status(201).json({ token, user: { id: userId, email: b.email, name: b.name, role: "owner" },
                        tenant: { id: tenantId, slug: b.slug, name: b.workspace_name } });
}

// ---- login: email+password within a workspace ----
const loginSchema = z.object({
  slug: z.string(),
  email: z.string().email(),
  password: z.string(),
});

export async function login(req, res) {
  const b = loginSchema.parse(req.body);
  const rows = await sql`
    SELECT u.id, u.tenant_id, u.password_hash, u.role, u.name, u.email, t.slug, t.name AS tenant_name
    FROM users u
    JOIN tenants t ON t.id = u.tenant_id
    WHERE t.slug = ${b.slug} AND u.email = ${b.email}`;

  if (rows.length === 0) throw badRequest("invalid_credentials", "invalid email or password");
  const u = rows[0];
  const ok = await bcrypt.compare(b.password, u.password_hash);
  if (!ok) throw badRequest("invalid_credentials", "invalid email or password");

  await sql`UPDATE users SET last_login_at = now() WHERE id = ${u.id}`;
  const token = signToken({ user_id: u.id, tenant_id: u.tenant_id, role: u.role });
  res.json({
    token,
    user: { id: u.id, email: u.email, name: u.name, role: u.role },
    tenant: { id: u.tenant_id, slug: u.slug, name: u.tenant_name },
  });
}

export async function me(req, res) {
  const rows = await sql`
    SELECT u.id, u.email, u.name, u.role, t.id AS tenant_id, t.slug, t.name AS tenant_name, t.plan
    FROM users u JOIN tenants t ON t.id = u.tenant_id
    WHERE u.id = ${req.user.id} AND u.tenant_id = ${req.tenantId}`;
  if (rows.length === 0) return res.status(404).json({ error: "user_not_found" });
  res.json(rows[0]);
}
