# One to Many · Backend

Production-ready **Node.js + Neon (Postgres) + multi-tenant** backend for the Multi-Channel Listing & Master Inventory OS.

Mirrors every feature in the frontend: master products, variants, per-channel listings, stock allocation modes (central pool vs allocated per channel), CSV import with image mapping, S3 presigned uploads, audit log, sync jobs, and cross-workspace tenant isolation.

---

## Stack

| Layer          | Choice                                   | Why |
| -------------- | ---------------------------------------- | --- |
| Runtime        | Node 20+                                 | ESM, `--watch`, native fetch |
| Framework      | Express 4                                | boring, fast, huge ecosystem |
| DB             | Neon Postgres                            | serverless, autoscaling, branchable |
| Drivers        | `@neondatabase/serverless` + `pg`        | HTTP for one-shot, TCP pool for tx |
| Auth           | JWT (HS256) with `tenant_id` claim       | stateless, tenant-scoped |
| Validation     | Zod                                      | runtime + type-safe |
| Uploads        | S3 presigned URLs (any S3-compatible)    | app never touches file bytes |
| Isolation      | Row Level Security via `tenant_id`       | defence in depth |
| IDs            | ULID                                     | k-sortable, URL-safe |
| Logging        | pino + pino-http                         | structured JSON logs |

---

## Multi-Tenancy Model

**Shared schema, `tenant_id` column on every table.**

Three defences stack:
1. **JWT** — every request carries a `tenant_id` claim signed with `JWT_SECRET`. The `requireAuth` middleware attaches it to `req.tenantId`.
2. **Application layer** — every query goes through `withTenant(tenantId, fn)` or `withTenantRO(tenantId, fn)` which set the Postgres session variable `app.tenant_id`.
3. **Row Level Security (RLS)** — every tenant-scoped table has:
   ```sql
   CREATE POLICY tenant_isolation ON <table>
     USING (tenant_id = current_setting('app.tenant_id', true));
   ```
   Even if application code forgets a WHERE clause, Postgres blocks cross-tenant reads.

This is the pattern used by Linear, PostHog, Cal.com, and virtually every modern B2B SaaS on Postgres.

### Why not schema-per-tenant?
Schema-per-tenant sounds cleaner but breaks at scale: migrations must fan out, connection pools multiply, and cross-tenant analytics become miserable. Shared-schema + RLS is what Neon, Supabase, and Firebase all recommend.

---

## Connection Pooling on Neon

Neon exposes **two endpoints** per branch:

| Endpoint | Suffix | Use for |
| -------- | ------ | ------- |
| Direct   | `ep-xxxx…` | Migrations, one-shot serverless HTTP queries |
| Pooler   | `ep-xxxx-pooler…` | Long-lived Node processes (this backend) |

We use **both** — see `src/db/client.js`:

```js
export const sql  = neon(process.env.DATABASE_URL);          // HTTP one-shot, no session
export const pool = new pg.Pool({                            // TCP pool for tx + SET LOCAL
  connectionString: process.env.DATABASE_POOL_URL,
  max: 10, idleTimeoutMillis: 10_000
});
```

**Why two drivers?**
- `sql` (HTTPS) has **zero cold-connection cost** and works from Vercel Edge / Cloudflare Workers. Perfect for `/health`, auth, and read-heavy endpoints where you don't need a transaction.
- `pool` (TCP over Neon's pooler) is required for anything that uses **`SET LOCAL app.tenant_id`** — that session variable disappears the moment the connection returns to the pool, so it must live inside a single transaction. HTTP driver cannot do this.

Neon's pooler multiplexes many app connections onto a smaller number of underlying Postgres connections, so `max: 10` on the app side is safe even with hundreds of concurrent requests.

**Rule of thumb:** if the endpoint touches only `tenants` or `users` for auth, use `sql`. Everything else uses `withTenant(tenantId, fn)` which uses the `pool`.

---

## Schema Overview

See [`src/db/schema.sql`](src/db/schema.sql) for the full DDL. Highlights:

| Table                 | Purpose | Notable columns |
| --------------------- | ------- | --------------- |
| `tenants`             | Root workspace | `slug` (subdomain), `plan`, `settings` |
| `users`               | Users in a tenant | `role` (owner/admin/member/viewer), unique per (tenant, email) |
| `products`            | Master SKUs | `stock`, `stock_mode` (central/allocated), `option_axes` JSON, `images` JSON |
| `variants`            | Cartesian expansions | `options` JSON, own `stock`/`price` |
| `channels`            | Marketplace connections | `credentials` JSON (encrypt with KMS in prod!) |
| `listings`            | Product × channel deployment | `stock`, `price`, `title_override`, `bullets` |
| `orders` / `order_items` | Cross-channel orders | `channel_order_id` unique per channel |
| `returns`             | Return workflow | `status`, `reason`, `amount` |
| `audit_log`           | Immutable event log | append-only, indexed by (tenant, time) |
| `sync_jobs`           | Background worker queue | `status`, `attempts`, `payload` |

Every one of the above (except `tenants` itself) has:
- `tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- An RLS policy enforcing `tenant_id = current_setting('app.tenant_id', true)`

---

## Setup

```bash
cd backend-nodejs
cp .env.example .env             # fill in Neon URLs, JWT_SECRET, S3 creds
yarn                             # or npm install
yarn db:migrate                  # applies schema.sql
yarn dev                         # http://localhost:8080
```

### Neon URLs
Grab both from your Neon dashboard → Connection details:
- **Direct** URL → `DATABASE_URL`
- **Pooled** URL (has `-pooler` in the host) → `DATABASE_POOL_URL`

Both must include `?sslmode=require`.

---

## API Reference

### Auth
| Method | Path | Body |
| ------ | ---- | ---- |
| POST   | `/api/auth/signup` | `{ workspace_name, slug, name, email, password }` |
| POST   | `/api/auth/login`  | `{ slug, email, password }` |
| GET    | `/api/auth/me`     | *(auth)* |

Response includes `{ token, user, tenant }`. Include token as `Authorization: Bearer <token>` on every subsequent request.

### Products
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET    | `/api/products?q=&status=&category_id=&limit=&offset=` | Paginated list |
| POST   | `/api/products` | Create master SKU |
| GET    | `/api/products/:id` | Includes variants + listings |
| PATCH  | `/api/products/:id` | Partial update |
| POST   | `/api/products/:id/stock-mode` | Body: `{ mode: "central"\|"allocated" }` |
| POST   | `/api/products/:id/auto-balance` | Even-split master across listings |

### Variants
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET    | `/api/products/:id/variants` | List variants |
| POST   | `/api/products/:id/variants/regenerate` | Cartesian regen after option changes |
| PATCH  | `/api/variants/:id` | Update stock/price/image |

### Listings
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET    | `/api/listings?grouped=true&status=&channel_id=&q=` | Grouped or flat |
| POST   | `/api/listings/publish` | `{ product_id, channel_ids: [] }` |
| PATCH  | `/api/listings/:id` | Channel-specific overrides |

### Uploads (S3)
| Method | Path | Notes |
| ------ | ---- | ----- |
| POST   | `/api/uploads/presign` | `{ filename, content_type, size }` → `{ upload_url, public_url }` |
| POST   | `/api/uploads/attach`  | `{ product_id, urls: [] }` |

**Upload flow from the frontend:**
```js
// 1. Ask backend for a presigned URL
const { upload_url, public_url } = await api.post("/api/uploads/presign", {
  filename: file.name, content_type: file.type, size: file.size,
}).then(r => r.data);

// 2. PUT the file directly to S3 (no backend bandwidth used)
await fetch(upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });

// 3. Attach the URL to the product
await api.post("/api/uploads/attach", { product_id, urls: [public_url] });
```

### CSV Import
| Method | Path | Notes |
| ------ | ---- | ----- |
| POST   | `/api/imports/csv` | multipart: `file` + `mapping` JSON + optional `direct_list_channel_ids` |

Mapping example:
```json
{
  "sku": "sku", "title": "title", "brand": "brand", "category": "category",
  "mrp": "mrp", "cost": "cost", "stock": "stock",
  "image_url_1": "hero_image", "image_url_2": "alt_1"
}
```

---

## Deployment

**Recommended: Railway or Fly.io** (long-lived Node process needed for the TCP pool + workers).

**Do NOT deploy this to Vercel/Cloudflare Workers as-is** — the `pg` pool needs a stateful Node process. If you must go serverless, refactor to use only `sql` (Neon HTTPS driver) and set `app.tenant_id` via `SET` inline in each query — but you lose RLS-via-session-var protection.

### Env checklist before going live
- [ ] `JWT_SECRET` is a 64-char random string
- [ ] `DATABASE_POOL_URL` points to the `*-pooler` host
- [ ] `CORS_ORIGINS` locked down to your frontend domain(s)
- [ ] `channels.credentials` column encrypted with KMS (add a `pgcrypto`-based helper or app-level encryption)
- [ ] Rate limiter tuned to your traffic (`express-rate-limit`)

---

## Background Sync Worker

Every listing publish/update inserts into `sync_jobs`. Run a separate worker process:

```js
// worker.js — poll sync_jobs, dispatch to per-channel adapters
setInterval(async () => {
  const jobs = await sql`
    UPDATE sync_jobs SET status='running', started_at=now(), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM sync_jobs
      WHERE status='queued' AND scheduled_at <= now()
      ORDER BY scheduled_at LIMIT 20 FOR UPDATE SKIP LOCKED
    ) RETURNING *`;
  await Promise.all(jobs.map(handleJob));
}, 2000);
```

Use `FOR UPDATE SKIP LOCKED` so multiple workers can pull concurrently without stepping on each other. Neon supports this out of the box.

---

## Testing

```bash
curl -s -X POST $API/auth/signup -H 'content-type: application/json' \
  -d '{"workspace_name":"Stride HQ","slug":"stride","name":"Ananya","email":"a@x.com","password":"password123"}' \
  | jq

TOKEN=$(curl -s -X POST $API/auth/login -H 'content-type: application/json' \
  -d '{"slug":"stride","email":"a@x.com","password":"password123"}' | jq -r .token)

curl -s -X POST $API/products -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"sku":"TEST-001","title":"Test","mrp":1000,"cost":500,"stock":10}' | jq
```

---

## Where to plug in your existing tenant management

If your app already has a `tenants` table and JWT with a `tenant_id` claim:
1. Skip the DDL for `tenants` in `schema.sql`.
2. Make sure your JWT payload contains `tenant_id` (this middleware reads `payload.tenant_id`).
3. Rewrite `src/middleware/auth.js` if your existing token format differs — everything else keeps working.
