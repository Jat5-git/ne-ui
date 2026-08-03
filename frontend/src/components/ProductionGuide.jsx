import React, { useState } from "react";
import { X, BookOpen, Server, Cloud, Zap, Shield, ChevronRight, Copy, Check } from "lucide-react";

const SNIPPETS = {
  backend: `# FastAPI + boto3 presigned upload endpoint (production sketch)
from fastapi import APIRouter, HTTPException
import boto3, uuid, os

router = APIRouter(prefix="/api/uploads")
s3 = boto3.client("s3", region_name=os.environ["AWS_REGION"])

@router.post("/presign")
async def presign(payload: dict):
    # payload: { filename, content_type }
    key = f"products/{uuid.uuid4()}/{payload['filename']}"
    url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": os.environ["S3_BUCKET"],
            "Key": key,
            "ContentType": payload["content_type"],
        },
        ExpiresIn=300,  # 5 minutes
    )
    public_url = f"https://cdn.yourdomain.com/{key}"
    return { "upload_url": url, "public_url": public_url, "key": key }`,

  frontend: `// React: upload directly to S3 with the presigned URL
async function uploadImage(file) {
  // 1. Ask backend for a presigned URL
  const res = await axios.post(\`\${API}/uploads/presign\`, {
    filename: file.name,
    content_type: file.type,
  });
  const { upload_url, public_url } = res.data;

  // 2. PUT the file directly to S3 (no backend bandwidth)
  await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  // 3. Save the public_url on the product
  await axios.patch(\`\${API}/products/\${productId}\`, {
    $push: { images: public_url },
  });
  return public_url;
}`,

  emergent: `# Emergent Object Storage (managed) — simpler alternative
# 1. Ask the integration agent for the "object storage" playbook
# 2. Upload endpoint is provisioned automatically; you get:
#    - POST /api/storage/upload  (multipart)
#    - Returns { url, key, size, content_type }
# 3. No S3/IAM setup, no CORS config, no CDN wiring
# 4. Retention, ACL, and per-file expiry configurable in the dashboard
# Ideal for MVPs where you don't want to run infra.`,
};

const STEPS = [
  { icon: Cloud, title: "1. Pick object storage", body: "Amazon S3 (industry standard), Google Cloud Storage, Cloudflare R2 (S3-compatible, cheaper egress), Cloudinary (media-focused with transforms), or Emergent Object Storage (managed, zero-config)." },
  { icon: Shield, title: "2. Never store files on your app server", body: "App servers scale horizontally and don't share disks. Files uploaded to /var/uploads vanish on next deploy. Always use object storage + a CDN." },
  { icon: Zap, title: "3. Use presigned URLs, not proxy uploads", body: "Frontend asks backend for a presigned URL, then PUTs the file directly to storage. This saves your server bandwidth and works well on Cloudflare Workers / Vercel Edge." },
  { icon: Server, title: "4. Store only URLs in Mongo", body: "Product.images = ['https://cdn.yourdomain.com/products/mp_001/hero.webp', ...]. Never store binary blobs in the DB. Add width/height/blurhash if you need placeholders." },
  { icon: BookOpen, title: "5. Post-processing pipeline", body: "Generate WebP + AVIF variants at 320/640/1280/1920 widths using Lambda + Sharp, or Cloudinary's on-the-fly transforms. Serve via <img srcSet>." },
];

export default function ProductionGuide({ onClose }) {
  const [tab, setTab] = useState("overview");
  const [copied, setCopied] = useState("");

  const copy = (key) => {
    navigator.clipboard.writeText(SNIPPETS[key]);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-6" data-testid="prod-guide">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col border border-[var(--border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Production Guide</div>
            <div className="font-display font-black text-lg tracking-tight mt-0.5">Wiring real image uploads</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface)] rounded-sm" data-testid="prod-guide-close"><X size={16} /></button>
        </div>

        <div className="px-6 border-b border-[var(--border)]">
          <div className="flex gap-6">
            {[
              { key: "overview", label: "Overview" },
              { key: "backend", label: "Backend (FastAPI + S3)" },
              { key: "frontend", label: "Frontend Upload" },
              { key: "emergent", label: "Emergent Storage" },
            ].map(t => (
              <button
                key={t.key}
                data-testid={`guide-tab-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`py-3 text-[12px] border-b-2 transition-colors ${tab === t.key ? "border-[var(--primary)] text-[var(--fg)] font-medium" : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === "overview" && (
            <div className="space-y-3">
              <p className="text-[13px] leading-relaxed">This prototype stores images as base64 strings in your browser. For a real production app, follow these steps:</p>
              <div className="space-y-2 mt-4">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex gap-3 p-4 border border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                      <div className="w-8 h-8 shrink-0 border border-[var(--border)] flex items-center justify-center">
                        <Icon size={14} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium">{s.title}</div>
                        <div className="text-[12px] text-[var(--fg-muted)] mt-1 leading-relaxed">{s.body}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 border border-[var(--primary)] bg-[#F0F4FF]">
                <div className="text-[10px] uppercase tracking-widest text-[var(--primary)] font-semibold mb-1">Recommended for this app</div>
                <div className="text-[13px] leading-relaxed">
                  Start with <b>Emergent Object Storage</b> (zero-config, integrates with FastAPI backend). When you outgrow the free tier or need custom CDN edge rules, migrate to <b>Cloudflare R2</b> — S3-compatible, ~1/10 the egress cost of AWS.
                </div>
              </div>
            </div>
          )}

          {["backend", "frontend", "emergent"].includes(tab) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">
                  {tab === "backend" ? "Presigned URL endpoint" : tab === "frontend" ? "Direct-to-storage upload" : "Managed integration"}
                </div>
                <button data-testid={`copy-${tab}`} onClick={() => copy(tab)} className="px-2.5 py-1 text-[11px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5">
                  {copied === tab ? <><Check size={11} className="text-[var(--success)]" />Copied</> : <><Copy size={11} />Copy</>}
                </button>
              </div>
              <pre className="p-4 bg-[#0A0A0A] text-[12px] leading-relaxed overflow-x-auto font-mono text-neutral-100 border border-[var(--border)]">
                <code>{SNIPPETS[tab]}</code>
              </pre>
              {tab === "emergent" && (
                <div className="mt-3 p-3 border border-[var(--border)] bg-[var(--surface)] text-[12px]">
                  Ask this platform's integration agent for the &ldquo;object storage&rdquo; playbook to auto-provision the endpoint, keys, and dashboard.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--fg-muted)]">Once wired, the ImageUploader component in this app needs only one line change — replace FileReader with your uploadImage() call.</span>
          <button onClick={onClose} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">Got it</button>
        </div>
      </div>
    </div>
  );
}
