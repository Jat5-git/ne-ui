// Seed the 12 system attributes into a fresh tenant. Idempotent — safe to run
// multiple times.
import { ulid } from "ulid";

export const SYSTEM_ATTRIBUTES = [
  { key: "gtin",             label: "GTIN (UPC/EAN)",     type: "text",     options: [],                                        channels: ["amazon","flipkart"],   required: true,  hint: "12-13 digit barcode", sort_order: 10 },
  { key: "hsn_code",         label: "HSN Code",           type: "text",     options: [],                                        channels: ["global"],              required: true,  hint: "8-digit HSN for India", sort_order: 20 },
  { key: "gst_rate",         label: "GST Rate (%)",       type: "select",   options: ["0","5","12","18","28"],                  channels: ["global"],              required: true,  sort_order: 30 },
  { key: "bullet_1",         label: "Amazon Bullet 1",    type: "text",     options: [],                                        channels: ["amazon"],              required: true,  hint: "Max 500 chars", sort_order: 40 },
  { key: "description",      label: "Long Description",   type: "textarea", options: [],                                        channels: ["global"],              required: true,  hint: "Max 2000 chars", sort_order: 50 },
  { key: "model_number",     label: "Model Number",       type: "text",     options: [],                                        channels: ["flipkart","amazon"],   required: true,  sort_order: 60 },
  { key: "vendor",           label: "Shopify Vendor",     type: "text",     options: [],                                        channels: ["shopify"],             required: true,  sort_order: 70 },
  { key: "regular_price",    label: "Woo Regular Price",  type: "number",   options: [],                                        channels: ["woocommerce"],         required: true,  sort_order: 80 },
  { key: "country_of_origin",label: "Country of Origin",  type: "select",   options: ["India","China","Vietnam","USA","Germany"], channels: ["global"],           required: true,  sort_order: 90 },
  { key: "gender",           label: "Gender",             type: "select",   options: ["Men","Women","Unisex","Boys","Girls"],   channels: ["global"],              required: false, sort_order: 100 },
  { key: "material",         label: "Material",           type: "text",     options: [],                                        channels: ["global"],              required: false, sort_order: 110 },
  { key: "warranty_months",  label: "Warranty (months)",  type: "number",   options: [],                                        channels: ["global"],              required: false, sort_order: 120 },
];

export async function seedAttributesForTenant(client, tenantId) {
  for (const a of SYSTEM_ATTRIBUTES) {
    await client.query(
      `INSERT INTO attribute_definitions
         (id, tenant_id, key, label, type, options, channels, required, hint, system, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,true,$10)
       ON CONFLICT (tenant_id, key) DO NOTHING`,
      [`attr_${ulid()}`, tenantId, a.key, a.label, a.type,
       JSON.stringify(a.options), a.channels, a.required, a.hint || null, a.sort_order],
    );
  }
}
