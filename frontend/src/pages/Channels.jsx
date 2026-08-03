import React from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";
import { Plug, Settings } from "lucide-react";
import { toast } from "sonner";

const CATALOG = [
  { key: "amazon", name: "Amazon India", desc: "MWS + SP-API compatible. Sync every 15 min." },
  { key: "shopify", name: "Shopify", desc: "Admin API 2024-10. Real-time webhooks." },
  { key: "flipkart", name: "Flipkart Seller Hub", desc: "OAuth 2.0. Batch sync every 30 min." },
  { key: "woocommerce", name: "WooCommerce", desc: "REST API v3 with consumer keys." },
];

export default function Channels() {
  const { channels, toggleChannel } = useStore();
  return (
    <>
      <Topbar title="Channels" breadcrumb="Setup & Assets" subtitle="Connect the marketplaces you sell on." />
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATALOG.map(c => {
            const conn = channels.find(x => x.key === c.key);
            return (
              <div key={c.key} className="border border-[var(--border)] p-5 bg-white hover:shadow-sm transition-shadow" data-testid={`channel-card-${c.key}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ChannelChip channel={c.key} />
                    {conn && <StatusPill status={conn.status} />}
                  </div>
                  <button data-testid={`ch-toggle-${c.key}`} onClick={() => { toggleChannel(conn.id); toast.info(`${c.name} ${conn.status === "connected" ? "disconnected" : "connected"}`); }} className="p-1.5 hover:bg-[var(--surface)] rounded-sm"><Settings size={13} /></button>
                </div>
                <div className="font-display text-lg font-black tracking-tight">{c.name}</div>
                <div className="text-[12px] text-[var(--fg-muted)] mt-1">{c.desc}</div>
                {conn && (
                  <div className="mt-4 grid grid-cols-3 border-t border-[var(--border)] pt-3">
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-[var(--fg-muted)]">Listings</div>
                      <div className="tabular text-[16px] font-medium mt-0.5">{conn.listings}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-[var(--fg-muted)]">Revenue 30d</div>
                      <div className="tabular text-[16px] font-medium mt-0.5">₹{(conn.revenue_30d / 1000).toFixed(0)}k</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-[var(--fg-muted)]">Since</div>
                      <div className="tabular text-[12px] mt-1">{conn.connected_at}</div>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <button className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5">
                    <Plug size={12} />{conn?.status === "connected" ? "Reconfigure" : "Connect"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
