import { withTenant, withTenantRO } from "../db/tenantContext.js";
import { ulid } from "ulid";
import { notFound } from "../middleware/error.js";
import { z } from "zod";

const cartesian = (axes) => {
  if (!axes || axes.length === 0) return [];
  return axes.reduce((acc, ax) => {
    if (acc.length === 0) return ax.values.map(v => ({ [ax.name]: v }));
    return acc.flatMap(row => ax.values.map(v => ({ ...row, [ax.name]: v })));
  }, []);
};

const abbr = (v) => {
  const map = { "Obsidian":"OBS","Chalk White":"CHW","Ember Red":"EMR","Black":"BLK" };
  return map[v] || v.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
};

const buildVariantSku = (master, opts) => `${master}-${Object.values(opts).map(abbr).join("-")}`;

export async function listVariants(req, res) {
  const { id } = req.params;
  const rows = await withTenantRO(req.tenantId, async (c) => {
    const { rows } = await c.query(
      "SELECT * FROM variants WHERE product_id = $1 ORDER BY sku", [id]);
    return rows;
  });
  res.json({ data: rows });
}

// Regenerate the cartesian variants when option axes or values change.
// Call this after updating product.option_axes.
export async function regenerateVariants(req, res) {
  const { id } = req.params;
  const out = await withTenant(req.tenantId, async (c) => {
    const { rows: pRows } = await c.query(
      "SELECT sku, option_axes, mrp FROM products WHERE id = $1", [id]);
    if (pRows.length === 0) throw notFound("product_not_found");
    const p = pRows[0];
    const combos = cartesian(p.option_axes);

    const { rows: existing } = await c.query(
      "SELECT id, options FROM variants WHERE product_id = $1", [id]);
    const key = (o) => JSON.stringify(o);
    const existingKeys = new Set(existing.map(r => key(r.options)));

    let created = 0, deleted = 0;
    for (const combo of combos) {
      if (existingKeys.has(key(combo))) continue;
      const vid = `var_${ulid()}`;
      const sku = buildVariantSku(p.sku, combo);
      await c.query(
        `INSERT INTO variants (id, tenant_id, product_id, sku, options, stock, price)
         VALUES ($1,$2,$3,$4,$5::jsonb,0,$6)`,
        [vid, req.tenantId, id, sku, JSON.stringify(combo), p.mrp]);
      created++;
    }

    // Optionally drop variants whose option combo no longer exists in the axes.
    const validKeys = new Set(combos.map(key));
    for (const row of existing) {
      if (!validKeys.has(key(row.options))) {
        await c.query("DELETE FROM variants WHERE id = $1", [row.id]);
        deleted++;
      }
    }
    return { created, deleted, total: combos.length };
  });
  res.json(out);
}

const variantUpdate = z.object({
  stock: z.number().int().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  image_url: z.string().url().nullable().optional(),
});

export async function updateVariant(req, res) {
  const { id } = req.params; // variant id
  const body = variantUpdate.parse(req.body);
  const keys = Object.keys(body);
  if (keys.length === 0) return res.status(400).json({ error: "empty_update" });
  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map(k => body[k]);
  values.push(id);
  const updated = await withTenant(req.tenantId, async (c) => {
    const { rows } = await c.query(
      `UPDATE variants SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`, values);
    if (rows.length === 0) throw notFound("variant_not_found");
    return rows[0];
  });
  res.json(updated);
}
