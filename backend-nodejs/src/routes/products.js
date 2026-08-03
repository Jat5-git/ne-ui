import { withTenant, withTenantRO } from "../db/tenantContext.js";
import { ulid } from "ulid";
import { badRequest, notFound } from "../middleware/error.js";
import { z } from "zod";

const productCreateSchema = z.object({
  sku: z.string().min(1).max(64),
  title: z.string().min(1).max(256),
  brand_id: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  mrp: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  weight_kg: z.number().nonnegative().optional().default(0),
  stock_mode: z.enum(["central", "allocated"]).default("central"),
  option_axes: z.array(z.object({ name: z.string(), values: z.array(z.string()) })).default([]),
  images: z.array(z.string().url()).max(6).default([]),
  attributes: z.record(z.any()).default({}),
});

// ---- list with filters, pagination, search ----
export async function listProducts(req, res) {
  const { q, status, category_id, limit = 50, offset = 0 } = req.query;
  const rows = await withTenantRO(req.tenantId, async (c) => {
    const conds = [];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      conds.push(`(title ILIKE $${params.length} OR sku ILIKE $${params.length})`);
    }
    if (status) { params.push(status); conds.push(`status = $${params.length}`); }
    if (category_id) { params.push(category_id); conds.push(`category_id = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    params.push(parseInt(limit, 10)); const l = `$${params.length}`;
    params.push(parseInt(offset, 10)); const o = `$${params.length}`;
    const { rows } = await c.query(
      `SELECT p.*, b.name AS brand_name, cat.name AS category_name,
              (SELECT count(*) FROM listings l WHERE l.product_id = p.id) AS channel_count,
              (SELECT count(*) FROM variants v WHERE v.product_id = p.id) AS variant_count
       FROM products p
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN categories cat ON cat.id = p.category_id
       ${where}
       ORDER BY p.updated_at DESC LIMIT ${l} OFFSET ${o}`,
      params,
    );
    return rows;
  });
  res.json({ data: rows, limit: +limit, offset: +offset });
}

export async function getProduct(req, res) {
  const { id } = req.params;
  const data = await withTenantRO(req.tenantId, async (c) => {
    const { rows } = await c.query("SELECT * FROM products WHERE id = $1", [id]);
    if (rows.length === 0) throw notFound("product_not_found");
    const product = rows[0];
    const { rows: variants } = await c.query("SELECT * FROM variants WHERE product_id = $1 ORDER BY sku", [id]);
    const { rows: listings } = await c.query(
      `SELECT l.*, ch.key AS channel_key, ch.name AS channel_name
       FROM listings l JOIN channels ch ON ch.id = l.channel_id
       WHERE l.product_id = $1`, [id]);
    return { product, variants, listings };
  });
  res.json(data);
}

export async function createProduct(req, res) {
  const body = productCreateSchema.parse(req.body);
  const id = `mp_${ulid()}`;
  const created = await withTenant(req.tenantId, async (c) => {
    const { rows } = await c.query(
      `INSERT INTO products (id, tenant_id, sku, title, brand_id, category_id, mrp, cost, stock,
                             weight_kg, stock_mode, option_axes, images, attributes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb)
       RETURNING *`,
      [id, req.tenantId, body.sku, body.title, body.brand_id, body.category_id, body.mrp, body.cost,
       body.stock, body.weight_kg, body.stock_mode, JSON.stringify(body.option_axes),
       JSON.stringify(body.images), JSON.stringify(body.attributes)],
    );
    await c.query(
      `INSERT INTO audit_log (tenant_id, user_id, entity_type, entity_id, event, detail, level)
       VALUES ($1,$2,'product',$3,'Product created',$4,'success')`,
      [req.tenantId, req.user.id, id, `${body.sku} · ${body.title}`],
    );
    return rows[0];
  });
  res.status(201).json(created);
}

export async function updateProduct(req, res) {
  const { id } = req.params;
  const body = productCreateSchema.partial().parse(req.body);
  const keys = Object.keys(body);
  if (keys.length === 0) throw badRequest("empty_update", "no fields to update");

  const jsonFields = new Set(["option_axes", "images", "attributes"]);
  const sets = keys.map((k, i) => `${k} = $${i + 1}${jsonFields.has(k) ? "::jsonb" : ""}`);
  const values = keys.map(k => jsonFields.has(k) ? JSON.stringify(body[k]) : body[k]);
  values.push(id);

  const updated = await withTenant(req.tenantId, async (c) => {
    const { rows } = await c.query(
      `UPDATE products SET ${sets.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (rows.length === 0) throw notFound("product_not_found");
    return rows[0];
  });
  res.json(updated);
}

// ---- stock allocation ----
export async function setStockMode(req, res) {
  const { id } = req.params;
  const mode = z.enum(["central", "allocated"]).parse(req.body.mode);
  const result = await withTenant(req.tenantId, async (c) => {
    const { rows } = await c.query("SELECT stock_mode, stock FROM products WHERE id = $1", [id]);
    if (rows.length === 0) throw notFound("product_not_found");
    const p = rows[0];

    if (mode === "central" && p.stock_mode === "allocated") {
      // Sum current listing stocks back into the master pool
      const { rows: sumRows } = await c.query(
        "SELECT COALESCE(SUM(stock),0)::int AS total FROM listings WHERE product_id = $1", [id]);
      await c.query("UPDATE products SET stock = $1, stock_mode = 'central' WHERE id = $2",
        [sumRows[0].total, id]);
    } else if (mode === "allocated" && p.stock_mode === "central") {
      // Split master pool evenly across current listings
      const { rows: lRows } = await c.query("SELECT id FROM listings WHERE product_id = $1", [id]);
      if (lRows.length > 0) {
        const per = Math.floor(p.stock / lRows.length);
        const remainder = p.stock - per * lRows.length;
        for (let i = 0; i < lRows.length; i++) {
          await c.query("UPDATE listings SET stock = $1 WHERE id = $2",
            [per + (i === 0 ? remainder : 0), lRows[i].id]);
        }
      }
      await c.query("UPDATE products SET stock_mode = 'allocated' WHERE id = $1", [id]);
    }
    const { rows: after } = await c.query("SELECT * FROM products WHERE id = $1", [id]);
    return after[0];
  });
  res.json(result);
}

export async function autoBalanceStock(req, res) {
  const { id } = req.params;
  const out = await withTenant(req.tenantId, async (c) => {
    const { rows: pRows } = await c.query("SELECT stock FROM products WHERE id = $1", [id]);
    if (pRows.length === 0) throw notFound("product_not_found");
    const { rows: lRows } = await c.query("SELECT id FROM listings WHERE product_id = $1", [id]);
    if (lRows.length === 0) return { updated: 0 };
    const per = Math.floor(pRows[0].stock / lRows.length);
    const remainder = pRows[0].stock - per * lRows.length;
    for (let i = 0; i < lRows.length; i++) {
      await c.query("UPDATE listings SET stock = $1, updated_at = now() WHERE id = $2",
        [per + (i === 0 ? remainder : 0), lRows[i].id]);
    }
    return { updated: lRows.length, per, remainder };
  });
  res.json(out);
}
