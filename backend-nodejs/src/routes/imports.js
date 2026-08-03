import multer from "multer";
import { parse } from "csv-parse/sync";
import { ulid } from "ulid";
import { withTenant } from "../db/tenantContext.js";
import { badRequest } from "../middleware/error.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
export const csvUpload = upload.single("file");

const REQUIRED = ["sku", "title", "brand", "category", "mrp", "cost", "stock"];
const OPTIONAL_FIXED = ["weight_kg", "image_url_1", "image_url_2", "image_url_3", "image_url_4", "image_url_5", "image_url_6"];

/**
 * POST /api/imports/csv  (multipart, field name "file")
 * Body form fields:
 *   mapping: JSON string mapping our field names (including attribute keys) to CSV columns
 *   direct_list_channel_ids: comma-separated channel IDs to publish to after import
 * The mapping now supports every attribute defined in attribute_definitions, so users can
 * bring GTIN/HSN/Model Number etc. directly in via CSV.
 */
export async function importCsv(req, res) {
  if (!req.file) throw badRequest("no_file", "CSV file required");
  const mapping = JSON.parse(req.body.mapping || "{}");
  const directListChannels = (req.body.direct_list_channel_ids || "").split(",").filter(Boolean);

  const records = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });

  const errors = [];
  const validRows = [];
  records.forEach((row, idx) => {
    const rowErrors = REQUIRED.filter(f => !mapping[f] || !row[mapping[f]]);
    if (rowErrors.length) errors.push({ row: idx + 2, missing: rowErrors });
    else validRows.push(row);
  });

  const result = await withTenant(req.tenantId, async (c) => {
    // Load the tenant's attribute definitions so any mapping[<attr_key>] pulls into channel_attributes.
    const { rows: defs } = await c.query("SELECT key, type FROM attribute_definitions");
    const attrKeys = new Set(defs.map(d => d.key));
    const attrTypes = Object.fromEntries(defs.map(d => [d.key, d.type]));

    const created = [];
    for (const row of validRows) {
      const images = OPTIONAL_FIXED
        .filter(k => k.startsWith("image_url_"))
        .map(k => mapping[k] ? row[mapping[k]] : "")
        .filter(u => u && u.trim());

      // Extract channel_attributes from the CSV using the mapping.
      const channel_attrs = {};
      for (const k of Object.keys(mapping)) {
        if (!attrKeys.has(k)) continue;
        const raw = row[mapping[k]];
        if (raw === undefined || raw === "") continue;
        if (attrTypes[k] === "number") channel_attrs[k] = parseFloat(raw) || 0;
        else if (attrTypes[k] === "checkbox") channel_attrs[k] = ["true","1","yes","y"].includes(String(raw).toLowerCase());
        else if (attrTypes[k] === "multiselect") channel_attrs[k] = raw.split("|").map(s => s.trim()).filter(Boolean);
        else channel_attrs[k] = raw;
      }

      // Look up brand / category by name (create if missing — dev convenience)
      const brandName = row[mapping.brand];
      const catName = row[mapping.category];
      let brand_id = null, category_id = null;
      if (brandName) {
        const { rows } = await c.query("SELECT id FROM brands WHERE name = $1", [brandName]);
        brand_id = rows[0]?.id || null;
      }
      if (catName) {
        const { rows } = await c.query("SELECT id FROM categories WHERE name = $1", [catName]);
        category_id = rows[0]?.id || null;
      }

      const id = `mp_${ulid()}`;
      const weight = mapping.weight_kg ? parseFloat(row[mapping.weight_kg]) || 0 : 0;

      const { rows: inserted } = await c.query(
        `INSERT INTO products (id, tenant_id, sku, title, brand_id, category_id, mrp, cost, stock,
                               weight_kg, stock_mode, images, channel_attributes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'central',$11::jsonb,$12::jsonb,'draft')
         ON CONFLICT (tenant_id, sku) DO UPDATE
           SET title = EXCLUDED.title, mrp = EXCLUDED.mrp, cost = EXCLUDED.cost,
               stock = EXCLUDED.stock, images = EXCLUDED.images,
               channel_attributes = products.channel_attributes || EXCLUDED.channel_attributes,
               updated_at = now()
         RETURNING id`,
        [id, req.tenantId, row[mapping.sku], row[mapping.title], brand_id, category_id,
         parseFloat(row[mapping.mrp]) || 0, parseFloat(row[mapping.cost]) || 0,
         parseInt(row[mapping.stock]) || 0, weight, JSON.stringify(images), JSON.stringify(channel_attrs)]);
      created.push(inserted[0].id);

      // Optionally publish to selected channels immediately
      if (directListChannels.length) {
        for (const chId of directListChannels) {
          await c.query(
            `INSERT INTO sync_jobs (id, tenant_id, channel_id, kind, payload)
             VALUES ($1,$2,$3,'publish',$4::jsonb)`,
            [`job_${ulid()}`, req.tenantId, chId, JSON.stringify({ product_id: inserted[0].id })]);
        }
      }
    }
    await c.query(
      `INSERT INTO audit_log (tenant_id, user_id, entity_type, entity_id, event, detail, level)
       VALUES ($1,$2,'import',NULL,'CSV import',$3,'success')`,
      [req.tenantId, req.user.id, `${created.length} products imported (${errors.length} errors)`]);
    return { created: created.length, product_ids: created };
  });
  res.json({ ...result, errors });
}
