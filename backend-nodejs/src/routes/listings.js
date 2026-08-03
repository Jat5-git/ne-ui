import { withTenant, withTenantRO } from "../db/tenantContext.js";
import { ulid } from "ulid";
import { badRequest, notFound } from "../middleware/error.js";
import { z } from "zod";

// GET /api/listings — supports grouping, filter, search
export async function listListings(req, res) {
  const { q, status, channel_id, grouped } = req.query;
  const rows = await withTenantRO(req.tenantId, async (c) => {
    const conds = ["1=1"];
    const params = [];
    if (q) { params.push(`%${q}%`); conds.push(`(p.title ILIKE $${params.length} OR p.sku ILIKE $${params.length})`); }
    if (status) { params.push(status); conds.push(`l.status = $${params.length}`); }
    if (channel_id) { params.push(channel_id); conds.push(`l.channel_id = $${params.length}`); }
    const { rows } = await c.query(
      `SELECT l.*, p.title, p.sku AS master_sku, p.stock_mode, p.stock AS master_stock,
              p.images, ch.key AS channel_key, ch.name AS channel_name
       FROM listings l
       JOIN products p ON p.id = l.product_id
       JOIN channels ch ON ch.id = l.channel_id
       WHERE ${conds.join(" AND ")}
       ORDER BY p.title, ch.key`, params);
    return rows;
  });

  // effective_stock: shared master when central mode, own stock when allocated
  const enriched = rows.map(r => ({
    ...r,
    effective_stock: r.stock_mode === "central" ? r.master_stock : r.stock,
  }));

  if (grouped === "true") {
    const groups = new Map();
    for (const r of enriched) {
      if (!groups.has(r.master_sku)) {
        groups.set(r.master_sku, {
          master_sku: r.master_sku, product_id: r.product_id, title: r.title,
          images: r.images, stock_mode: r.stock_mode, master_pool: r.master_stock, rows: [],
        });
      }
      groups.get(r.master_sku).rows.push(r);
    }
    return res.json({ data: Array.from(groups.values()) });
  }

  res.json({ data: enriched });
}

const listingCreate = z.object({
  product_id: z.string(),
  channel_ids: z.array(z.string()).min(1),
});

// Publish one product to N channels — creates listings + audit entries + queues sync jobs.
export async function publishToChannels(req, res) {
  const body = listingCreate.parse(req.body);
  const out = await withTenant(req.tenantId, async (c) => {
    const { rows: pRows } = await c.query("SELECT * FROM products WHERE id = $1", [body.product_id]);
    if (pRows.length === 0) throw notFound("product_not_found");
    const product = pRows[0];

    const priceMul = { amazon: 1.05, shopify: 1.10, flipkart: 1.02, woocommerce: 1.08 };
    const created = [];

    for (const chId of body.channel_ids) {
      const { rows: chRows } = await c.query("SELECT * FROM channels WHERE id = $1", [chId]);
      if (chRows.length === 0) continue;
      const ch = chRows[0];
      const mul = priceMul[ch.key] || 1.0;

      const listingId = `lst_${ulid()}`;
      const jobId = `job_${ulid()}`;
      const chSku = `${ch.key.slice(0,3).toUpperCase()}-${product.sku}`;
      const initialStock = product.stock_mode === "central" ? 0 : Math.floor(product.stock / body.channel_ids.length);

      const { rows: listing } = await c.query(
        `INSERT INTO listings (id, tenant_id, product_id, channel_id, channel_sku,
                               status, stock, price)
         VALUES ($1,$2,$3,$4,$5,'active',$6,$7)
         ON CONFLICT (tenant_id, channel_id, channel_sku) DO UPDATE
           SET status = 'active', updated_at = now()
         RETURNING *`,
        [listingId, req.tenantId, product.id, chId, chSku, initialStock, Math.round(product.mrp * mul)]);

      await c.query(
        `INSERT INTO sync_jobs (id, tenant_id, channel_id, kind, payload)
         VALUES ($1,$2,$3,'publish',$4::jsonb)`,
        [jobId, req.tenantId, chId, JSON.stringify({ listing_id: listing[0].id })]);

      await c.query(
        `INSERT INTO audit_log (tenant_id, user_id, entity_type, entity_id, event, detail, level)
         VALUES ($1,$2,'listing',$3,'Listing published',$4,'success')`,
        [req.tenantId, req.user.id, listing[0].id, `${product.sku} → ${ch.name}`]);

      created.push(listing[0]);
    }

    // Update product's status to 'listed' if not already
    await c.query("UPDATE products SET status = 'listed', updated_at = now() WHERE id = $1", [product.id]);
    return created;
  });
  res.status(201).json({ data: out });
}

const overrideSchema = z.object({
  price: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  status: z.enum(["active", "paused", "error"]).optional(),
  title_override: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  category_map: z.string().optional(),
});

export async function updateListing(req, res) {
  const { id } = req.params;
  const body = overrideSchema.parse(req.body);
  const keys = Object.keys(body);
  if (keys.length === 0) throw badRequest("empty_update", "no fields");
  const jsonFields = new Set(["bullets"]);
  const sets = keys.map((k, i) => `${k} = $${i + 1}${jsonFields.has(k) ? "::jsonb" : ""}`);
  const values = keys.map(k => jsonFields.has(k) ? JSON.stringify(body[k]) : body[k]);
  values.push(id);

  const updated = await withTenant(req.tenantId, async (c) => {
    const { rows } = await c.query(
      `UPDATE listings SET ${sets.join(", ")}, updated_at = now(), last_sync_at = now()
       WHERE id = $${values.length} RETURNING *`, values);
    if (rows.length === 0) throw notFound("listing_not_found");

    // Queue a sync job so the change propagates to the marketplace
    await c.query(
      `INSERT INTO sync_jobs (id, tenant_id, channel_id, kind, payload)
       VALUES ($1,$2,$3,'update',$4::jsonb)`,
      [`job_${ulid()}`, req.tenantId, rows[0].channel_id,
       JSON.stringify({ listing_id: rows[0].id, patch: body })]);

    await c.query(
      `INSERT INTO audit_log (tenant_id, user_id, entity_type, entity_id, event, detail, level)
       VALUES ($1,$2,'listing',$3,'Listing updated',$4,'info')`,
      [req.tenantId, req.user.id, id, keys.join(", ")]);
    return rows[0];
  });
  res.json(updated);
}
