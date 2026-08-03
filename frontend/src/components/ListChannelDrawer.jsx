import React, { useState } from "react";
import { X, Radio, Check } from "lucide-react";
import { useStore } from "@/store/StoreContext";
import { toast } from "sonner";
import { ChannelChip } from "./Pills";

const ALL_CHANNELS = [
  { key: "amazon", label: "Amazon India", desc: "SEO-optimized listing with bullet points & A+ content", mult: 1.05 },
  { key: "shopify", label: "Shopify Store", desc: "Storefront listing with rich descriptions and metafields", mult: 1.10 },
  { key: "flipkart", label: "Flipkart Seller", desc: "Category-mapped listing with commission tiers", mult: 1.02 },
  { key: "woocommerce", label: "WooCommerce Site", desc: "Self-hosted store, full attribute control", mult: 1.08 },
];

export default function ListChannelDrawer({ product, onClose }) {
  const { listProductOnChannels } = useStore();
  const already = new Set(product.channels || []);
  const [selected, setSelected] = useState(new Set());
  const [publishing, setPublishing] = useState(false);

  const toggle = (k) => setSelected(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  });

  const publish = async () => {
    if (selected.size === 0) return;
    setPublishing(true);
    const keys = Array.from(selected);
    // Simulate progressive sync
    for (const ch of keys) {
      await new Promise(r => setTimeout(r, 500));
      toast.success(`Synced ${product.sku} → ${ch.charAt(0).toUpperCase() + ch.slice(1)}`, { description: "Listing published successfully." });
    }
    listProductOnChannels(product.id, keys);
    setPublishing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" data-testid="list-drawer">
      <div className="bg-white w-full max-w-md h-full flex flex-col border-l border-[var(--border)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Publish to</div>
            <div className="font-display font-black text-lg tracking-tight mt-0.5">List on Channels</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface)] rounded-sm" data-testid="drawer-close"><X size={16} /></button>
        </div>

        <div className="p-5 border-b border-[var(--border)] flex items-start gap-3">
          <img src={product.image} alt="" className="w-14 h-14 object-cover border border-[var(--border)]" />
          <div className="min-w-0">
            <div className="font-medium">{product.title}</div>
            <div className="text-[11px] text-[var(--fg-muted)] tabular">{product.sku} · MRP ₹{product.mrp.toLocaleString("en-IN")} · Stock {product.stock}</div>
            {product.channels.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {product.channels.map(c => <ChannelChip key={c} channel={c} />)}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          <div className="text-[11px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-2">Select Channels</div>
          {ALL_CHANNELS.map(c => {
            const alreadyListed = already.has(c.key);
            const isSel = selected.has(c.key);
            return (
              <label key={c.key} data-testid={`ch-opt-${c.key}`} className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${alreadyListed ? "border-[var(--border)] bg-[var(--surface)] opacity-60 cursor-not-allowed" : isSel ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}>
                <input type="checkbox" disabled={alreadyListed} checked={isSel || alreadyListed} onChange={() => toggle(c.key)} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ChannelChip channel={c.key} />
                    <span className="text-[13px] font-medium">{c.label}</span>
                    {alreadyListed && <span className="text-[10px] text-[var(--success)] flex items-center gap-0.5"><Check size={10} />Already listed</span>}
                  </div>
                  <div className="text-[11px] text-[var(--fg-muted)] mt-1">{c.desc}</div>
                  <div className="text-[11px] tabular mt-1.5">Suggested price: <b>₹{Math.round(product.mrp * c.mult).toLocaleString("en-IN")}</b> <span className="text-[var(--fg-muted)]">({((c.mult - 1) * 100).toFixed(0)}% markup)</span></div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
          <span className="text-[12px] text-[var(--fg-muted)]">{selected.size} channel{selected.size !== 1 ? "s" : ""} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white">Cancel</button>
            <button
              data-testid="publish-listings"
              disabled={selected.size === 0 || publishing}
              onClick={publish}
              className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 flex items-center gap-1.5"
            >
              <Radio size={12} />{publishing ? "Publishing…" : `Publish to ${selected.size}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
