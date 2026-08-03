import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";
import { ArrowLeft, Save, ExternalLink, Pause, Play } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";

const TABS = ["Overview & Overrides", "Performance", "History"];

// Fake channel-specific performance data
const buildTrend = (base) => Array.from({ length: 14 }).map((_, i) => ({
  day: `D-${13 - i}`,
  units: Math.max(0, Math.round(base * (0.7 + Math.sin(i / 2) * 0.4 + Math.random() * 0.3))),
}));

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listings, updateListing, auditLog } = useStore();
  const listing = listings.find(l => l.id === id);
  const [tab, setTab] = useState(0);

  const [title, setTitle] = useState(listing?.title || "");
  const [bullets, setBullets] = useState(
    "Ultra-light EVA midsole for all-day comfort\nBreathable engineered mesh upper\nDurable rubber outsole with 2000km guarantee\nReflective heel for low-light visibility\nAvailable in 6 sizes (UK 6–11)"
  );
  const [price, setPrice] = useState(listing?.price || 0);
  const [discount, setDiscount] = useState(10);
  const [stock, setStock] = useState(listing?.stock || 0);
  const [categoryMap, setCategoryMap] = useState("Running Shoes → Athletic Footwear");

  if (!listing) return (
    <>
      <Topbar title="Listing not found" />
      <div className="p-8 text-[13px] text-[var(--fg-muted)]"><Link to="/listings" className="text-[var(--primary)]">← Back to Listings</Link></div>
    </>
  );

  const save = () => {
    updateListing(listing.id, { title, price: parseFloat(price) || listing.price, stock: parseInt(stock) || 0 });
    toast.success("Overrides saved & pushed to channel", { description: `${listing.channel_sku} updated on ${listing.channel_label}` });
  };

  const togglePause = () => {
    const next = listing.status === "paused" ? "active" : "paused";
    updateListing(listing.id, { status: next });
    toast.info(`Listing ${next === "paused" ? "paused" : "resumed"}`, { description: listing.channel_sku });
  };

  const trend = buildTrend(listing.units_sold_30d / 30 * 5);
  const relatedLogs = auditLog.filter(a => a.detail.includes(listing.master_sku) || a.detail.includes(listing.channel_label));

  return (
    <>
      <Topbar
        breadcrumb={<Link to="/listings" className="hover:underline">← Listings & Channels</Link>}
        title={listing.title}
        subtitle={<span className="flex items-center gap-2"><ChannelChip channel={listing.channel} /> <StatusPill status={listing.status} /> <span className="text-[var(--fg-muted)] tabular text-[11px]">· {listing.channel_sku}</span></span>}
        actions={
          <>
            <button data-testid="pause-btn" onClick={togglePause} className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5 transition-colors">
              {listing.status === "paused" ? <><Play size={12} />Resume</> : <><Pause size={12} />Pause</>}
            </button>
            <button data-testid="save-listing" onClick={save} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5 transition-colors">
              <Save size={12} />Save & Publish
            </button>
          </>
        }
      />

      <div className="border-b border-[var(--border)] px-8">
        <div className="flex gap-6">
          {TABS.map((t, i) => (
            <button
              key={t}
              data-testid={`tab-${i}`}
              onClick={() => setTab(i)}
              className={`py-3 text-[13px] border-b-2 transition-colors ${tab === i ? "border-[var(--primary)] text-[var(--fg)] font-medium" : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        {tab === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="border border-[var(--border)] p-5 space-y-4">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Channel Content Overrides</div>
                <label className="block">
                  <span className="text-[11px] font-medium text-[var(--fg-muted)]">Custom Title <span className="text-[var(--fg-muted)]">· {listing.channel_label} SEO optimized</span></span>
                  <input data-testid="ovr-title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full border border-[var(--border)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)]" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-[var(--fg-muted)]">Bullet Points · one per line ({listing.channel === "amazon" ? "max 5" : "max 8"})</span>
                  <textarea data-testid="ovr-bullets" value={bullets} onChange={e => setBullets(e.target.value)} rows={6} className="mt-1 w-full border border-[var(--border)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] resize-y" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-[var(--fg-muted)]">Category Mapping · {listing.channel_label}</span>
                  <input data-testid="ovr-cat" value={categoryMap} onChange={e => setCategoryMap(e.target.value)} className="mt-1 w-full border border-[var(--border)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] tabular" />
                </label>
              </div>

              <div className="border border-[var(--border)] p-5">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3">Media & Assets</div>
                <div className="flex gap-3">
                  {[listing.image, listing.image, listing.image].map((src, i) => (
                    <div key={i} className="w-20 h-20 border border-[var(--border)] overflow-hidden">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <button className="w-20 h-20 border border-dashed border-[var(--border)] text-[11px] text-[var(--fg-muted)] hover:bg-[var(--surface)]">+ Add</button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-[var(--border)] p-5 space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Pricing & Inventory</div>
                <label className="block">
                  <span className="text-[11px] font-medium text-[var(--fg-muted)]">Selling Price</span>
                  <div className="mt-1 flex border border-[var(--border)] focus-within:border-[var(--primary)]">
                    <span className="px-2 py-2 border-r border-[var(--border)] bg-[var(--surface)] text-[13px] tabular">₹</span>
                    <input data-testid="ovr-price" value={price} onChange={e => setPrice(e.target.value)} type="number" className="flex-1 px-3 py-2 text-[13px] outline-none tabular" />
                  </div>
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-[var(--fg-muted)]">Channel Discount (%)</span>
                  <input data-testid="ovr-discount" value={discount} onChange={e => setDiscount(e.target.value)} type="number" className="mt-1 w-full border border-[var(--border)] px-3 py-2 text-[13px] outline-none tabular" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-[var(--fg-muted)]">Stock on {listing.channel_label}</span>
                  <input data-testid="ovr-stock" value={stock} onChange={e => setStock(e.target.value)} type="number" className="mt-1 w-full border border-[var(--border)] px-3 py-2 text-[13px] outline-none tabular" />
                </label>
              </div>

              <div className="border border-[var(--border)] p-5">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3">Channel Info</div>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Master SKU</span><span className="tabular">{listing.master_sku}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Channel SKU</span><span className="tabular">{listing.channel_sku}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Last Sync</span><span className="tabular text-[11px]">{listing.last_synced}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--fg-muted)]">Listing URL</span><a className="text-[var(--primary)] flex items-center gap-1">Open <ExternalLink size={10} /></a></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 border border-[var(--border)]">
              <div className="p-4 border-r border-[var(--border)]">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Units Sold (30d)</div>
                <div className="text-2xl font-display font-black tabular mt-1">{listing.units_sold_30d}</div>
              </div>
              <div className="p-4 border-r border-[var(--border)]">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Revenue (30d)</div>
                <div className="text-2xl font-display font-black tabular mt-1">₹{listing.revenue_30d.toLocaleString("en-IN")}</div>
              </div>
              <div className="p-4 border-r border-[var(--border)]">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Avg Order Value</div>
                <div className="text-2xl font-display font-black tabular mt-1">₹{listing.price.toLocaleString("en-IN")}</div>
              </div>
              <div className="p-4">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Conversion Rate</div>
                <div className="text-2xl font-display font-black tabular mt-1">{(2.4 + Math.random() * 2).toFixed(1)}%</div>
              </div>
            </div>
            <div className="border border-[var(--border)] p-6">
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Sales Velocity · Last 14 days</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#E5E7EB" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="units" stroke="#002FA7" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 2 && (
          <div className="border border-[var(--border)]">
            <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
              <span className="text-[12px] font-medium">Complete audit trail</span>
              <span className="text-[11px] text-[var(--fg-muted)] tabular">{relatedLogs.length} entries</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {(relatedLogs.length > 0 ? relatedLogs : auditLog.slice(0, 5)).map((log, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-4 text-[13px]">
                  <span className="tabular text-[11px] text-[var(--fg-muted)] w-32 shrink-0">{log.ts}</span>
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 ${log.level === "error" ? "bg-[var(--danger)]" : log.level === "success" ? "bg-[var(--success)]" : "bg-[var(--fg-muted)]"}`}></span>
                  <div className="flex-1">
                    <div className="font-medium">{log.event}</div>
                    <div className="text-[12px] text-[var(--fg-muted)]">{log.detail}</div>
                  </div>
                  <span className="text-[11px] text-[var(--fg-muted)]">{log.actor}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
