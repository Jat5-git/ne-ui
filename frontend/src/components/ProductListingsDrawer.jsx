import React from "react";
import { X, ExternalLink } from "lucide-react";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "./Pills";
import { Link } from "react-router-dom";

export default function ProductListingsDrawer({ product, onClose }) {
  const { listings } = useStore();
  const rows = listings.filter(l => l.master_id === product.id);
  const totalRev = rows.reduce((s, l) => s + l.revenue_30d, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" data-testid="view-drawer">
      <div className="bg-white w-full max-w-2xl h-full flex flex-col border-l border-[var(--border)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Live Listings</div>
            <div className="font-display font-black text-lg tracking-tight mt-0.5">{product.title}</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface)] rounded-sm" data-testid="view-drawer-close"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-3 border-b border-[var(--border)]">
          <div className="p-4 border-r border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Channels</div>
            <div className="text-2xl font-display font-black tabular mt-1">{rows.length}</div>
          </div>
          <div className="p-4 border-r border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Units Sold (30d)</div>
            <div className="text-2xl font-display font-black tabular mt-1">{rows.reduce((s, l) => s + l.units_sold_30d, 0)}</div>
          </div>
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Revenue (30d)</div>
            <div className="text-2xl font-display font-black tabular mt-1">₹{totalRev.toLocaleString("en-IN")}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {rows.length === 0 && <div className="text-[13px] text-[var(--fg-muted)] text-center py-8">No live listings. Use &ldquo;List&rdquo; to publish this product.</div>}
          {rows.map(l => (
            <Link key={l.id} to={`/listings/${l.id}`} onClick={onClose} className="block border border-[var(--border)] p-4 hover:bg-[var(--surface)] transition-colors" data-testid={`view-listing-${l.id}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ChannelChip channel={l.channel} />
                  <StatusPill status={l.status} />
                </div>
                <ExternalLink size={13} className="text-[var(--fg-muted)]" />
              </div>
              <div className="grid grid-cols-3 gap-3 text-[12px]">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Channel SKU</div>
                  <div className="tabular mt-0.5">{l.channel_sku}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Price</div>
                  <div className="tabular mt-0.5 font-medium">₹{l.price.toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">Stock</div>
                  <div className={`tabular mt-0.5 ${l.stock === 0 ? "text-[var(--danger)]" : ""}`}>{l.stock}</div>
                </div>
              </div>
              <div className="text-[11px] text-[var(--fg-muted)] mt-2 tabular">Last synced: {l.last_synced}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
