import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { ulid } from "ulid";
import { withTenant } from "../db/tenantContext.js";

const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: !!process.env.S3_ENDPOINT,
});

const presignSchema = z.object({
  filename: z.string().min(1),
  content_type: z.string().regex(/^image\/(png|jpe?g|webp|gif)$/, "must be image/*"),
  size: z.number().int().positive().max(10 * 1024 * 1024, "max 10MB"),
});

/**
 * POST /api/uploads/presign
 * Returns a short-lived (5 min) S3 PUT URL. The frontend uploads directly to
 * S3/R2/MinIO — the app server never sees the file bytes.
 */
export async function presignUpload(req, res) {
  const { filename, content_type, size } = presignSchema.parse(req.body);
  const key = `tenants/${req.tenantId}/products/${ulid()}/${filename.replace(/[^\w.\-]+/g, "_")}`;
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: content_type,
    ContentLength: size,
  });
  const upload_url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
  const public_url = process.env.CDN_BASE_URL
    ? `${process.env.CDN_BASE_URL.replace(/\/$/, "")}/${key}`
    : `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
  res.json({ upload_url, public_url, key, expires_in: 300 });
}

const attachSchema = z.object({
  product_id: z.string(),
  urls: z.array(z.string().url()).min(1).max(6),
});

/**
 * POST /api/uploads/attach
 * After the frontend has PUT the image(s) directly to S3, it calls this to
 * persist the URLs onto a product (max 6 images per product).
 */
export async function attachImages(req, res) {
  const body = attachSchema.parse(req.body);
  const updated = await withTenant(req.tenantId, async (c) => {
    const { rows } = await c.query(
      `UPDATE products
       SET images = (
         COALESCE(images, '[]'::jsonb) || $1::jsonb
       ),
       updated_at = now()
       WHERE id = $2
       RETURNING images`,
      [JSON.stringify(body.urls), body.product_id]);
    if (rows.length === 0) throw new Error("product_not_found");
    // Enforce max 6
    let images = rows[0].images;
    if (images.length > 6) {
      images = images.slice(0, 6);
      await c.query("UPDATE products SET images = $1::jsonb WHERE id = $2",
        [JSON.stringify(images), body.product_id]);
    }
    await c.query(
      `INSERT INTO audit_log (tenant_id, user_id, entity_type, entity_id, event, detail, level)
       VALUES ($1,$2,'product',$3,'Images uploaded',$4,'success')`,
      [req.tenantId, req.user.id, body.product_id, `${body.urls.length} image(s)`]);
    return { images };
  });
  res.json(updated);
}
