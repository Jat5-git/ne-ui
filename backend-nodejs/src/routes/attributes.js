import { withTenant, withTenantRO } from "../db/tenantContext.js";
import { ulid } from "ulid";
import { badRequest, notFound } from "../middleware/error.js";
import { z } from "zod";

const attrSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, "lowercase, digits, underscores only").optional(),
  label: z.string().min(1).max(128),
  type: z.enum(["text","textarea","number","select","multiselect","checkbox"]),
  options: z.array(z.string()).default([]),
  channels: z.array(z.enum(["global","amazon","flipkart","shopify","woocommerce"])).min(1),
  required: z.boolean().default(false),
  hint: z.string().max(256).optional().nullable(),
  category_ids: z.array(z.string()).default([]),
  sort_order: z.number().int().default(100),
});

const keyFromLabel = (label) =>
  label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// Normalise channels: 'global' is exclusive — if present, other picks are dropped.
const normaliseChannels = (chs) => chs.includes("global") ? ["global"] : chs;

// ---- list all attributes for the tenant ----
// Query params: ?channels=amazon,flipkart  (optional filter)
export async function listAttributes(req, res) {
  const filterCh = (req.query.channels || "").split(",").filter(Boolean);
  const rows = await withTenantRO(req.tenantId, async (c) => {
    const { rows } = await c.query(
      "SELECT * FROM attribute_definitions ORDER BY sort_order, label");
    return rows;
  });
  const filtered = filterCh.length === 0
    ? rows
    : rows.filter(a => a.channels.includes("global") || a.channels.some(x => filterCh.includes(x)));
  res.json({ data: filtered });
}

// ---- create ----
export async function createAttribute(req, res) {
  const body = attrSchema.parse(req.body);
  const key = (body.key || keyFromLabel(body.label));
  const channels = normaliseChannels(body.channels);
  const id = `attr_${ulid()}`;
  const created = await withTenant(req.tenantId, async (c) => {
    const { rows } = await c.query(
      `INSERT INTO attribute_definitions
        (id, tenant_id, key, label, type, options, channels, required, hint, category_ids, sort_order, system)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,false)
       RETURNING *`,
      [id, req.tenantId, key, body.label, body.type, JSON.stringify(body.options),
       channels, body.required, body.hint, body.category_ids, body.sort_order],
    );
    await c.query(
      `INSERT INTO audit_log (tenant_id, user_id, entity_type, entity_id, event, detail, level)
       VALUES ($1,$2,'attribute',$3,'Attribute created',$4,'success')`,
      [req.tenantId, req.user.id, id, `${body.label} (${channels.join(",")})`],
    );
    return rows[0];
  });
  res.status(201).json(created);
}

// ---- update (system attributes are editable but cannot change key) ----
export async function updateAttribute(req, res) {
  const { id } = req.params;
  const body = attrSchema.partial().parse(req.body);
  const keys = Object.keys(body);
  if (keys.length === 0) throw badRequest("empty_update", "no fields");

  // Prevent renaming the key on system attributes so downstream products keep working.
  const existing = await withTenantRO(req.tenantId, async (c) => {
    const { rows } = await c.query("SELECT * FROM attribute_definitions WHERE id = $1", [id]);
    return rows[0];
  });
  if (!existing) throw notFound("attribute_not_found");
  if (existing.system && body.key && body.key !== existing.key) {
    throw badRequest("system_key_locked", "System attribute keys cannot be renamed");
  }

  if (body.channels) body.channels = normaliseChannels(body.channels);

  const jsonFields = new Set(["options"]);
  const arrayFields = new Set(["channels","category_ids"]);
  const sets = keys.map((k, i) => {
    if (jsonFields.has(k)) return `${k} = $${i + 1}::jsonb`;
    return `${k} = $${i + 1}`;
  });
  const values = keys.map(k => {
    if (jsonFields.has(k)) return JSON.stringify(body[k]);
    return body[k];
  });
  values.push(id);

  const updated = await withTenant(req.tenantId, async (c) => {
    const { rows } = await c.query(
      `UPDATE attribute_definitions SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length} RETURNING *`, values);
    await c.query(
      `INSERT INTO audit_log (tenant_id, user_id, entity_type, entity_id, event, detail, level)
       VALUES ($1,$2,'attribute',$3,'Attribute updated',$4,'info')`,
      [req.tenantId, req.user.id, id, keys.join(", ")]);
    return rows[0];
  });
  res.json(updated);
}

// ---- delete (system attributes are protected) ----
export async function deleteAttribute(req, res) {
  const { id } = req.params;
  const deleted = await withTenant(req.tenantId, async (c) => {
    const { rows } = await c.query("SELECT * FROM attribute_definitions WHERE id = $1", [id]);
    if (rows.length === 0) throw notFound("attribute_not_found");
    if (rows[0].system) throw badRequest("system_protected", "System attributes cannot be deleted");
    await c.query("DELETE FROM attribute_definitions WHERE id = $1", [id]);
    await c.query(
      `INSERT INTO audit_log (tenant_id, user_id, entity_type, entity_id, event, detail, level)
       VALUES ($1,$2,'attribute',$3,'Attribute deleted',$4,'info')`,
      [req.tenantId, req.user.id, id, rows[0].label]);
    return rows[0];
  });
  res.json({ deleted: deleted.id });
}

// ---- validate a product's channel_attributes against the current schema ----
// Useful before publishing to marketplaces to ensure all required fields are filled.
export async function validateAttributes(req, res) {
  const { product_id, channels = [] } = req.body || {};
  if (!product_id) throw badRequest("missing_product", "product_id required");
  const result = await withTenantRO(req.tenantId, async (c) => {
    const { rows: prod } = await c.query(
      "SELECT channel_attributes FROM products WHERE id = $1", [product_id]);
    if (prod.length === 0) throw notFound("product_not_found");
    const values = prod[0].channel_attributes || {};

    const { rows: defs } = await c.query(
      "SELECT * FROM attribute_definitions WHERE required = true");
    const applicable = defs.filter(d => d.channels.includes("global") || d.channels.some(ch => channels.includes(ch)));
    const missing = applicable.filter(d => {
      const v = values[d.key];
      return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    });
    return {
      ok: missing.length === 0,
      required_count: applicable.length,
      missing_count: missing.length,
      missing: missing.map(d => ({ key: d.key, label: d.label, channels: d.channels })),
    };
  });
  res.json(result);
}
