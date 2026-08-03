import React, { useState } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";
import { Search } from "lucide-react";

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

export default function Orders() {
  const { orders } = useStore();
  const [q, setQ] = useState("");
  const [ch, setCh] = useState("all");
  const filtered = orders.filter(o => (ch === "all" || o.channel === ch) && (!q || o.channel_order_id.toLowerCase().includes(q.toLowerCase()) || o.customer.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <Topbar title="Orders" breadcrumb="Operations · Unified" subtitle="All channels, one queue." />
      <div className="px-8 py-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-[var(--border)] px-2.5 py-1.5 flex-1 max-w-md">
            <Search size={13} className="text-[var(--fg-muted)]" />
            <input data-testid="orders-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Order ID or customer…" className="flex-1 text-[13px] outline-none bg-transparent" />
          </div>
          <div className="flex items-center border border-[var(--border)] divide-x divide-[var(--border)]">
            {["all", "amazon", "shopify", "flipkart", "woocommerce"].map(c => (
              <button key={c} data-testid={`ord-ch-${c}`} onClick={() => setCh(c)} className={`px-3 py-1.5 text-[12px] capitalize transition-colors ${ch === c ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}>{c}</button>
            ))}
          </div>
          <div className="ml-auto text-[12px] text-[var(--fg-muted)] tabular">{filtered.length} orders</div>
        </div>
        <div className="border border-[var(--border)] bg-white overflow-x-auto">
          <table className="w-full text-[13px]" data-testid="orders-table">
            <thead className="bg-[var(--surface)]">
              <tr className="border-b border-[var(--border)]">
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Order</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channel</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Customer</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Items</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Total</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Status</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b border-[var(--border)] last:border-b-0 row-hover" data-testid={`order-${o.id}`}>
                  <td className="p-3 tabular text-[12px]">{o.channel_order_id}</td>
                  <td className="p-3"><ChannelChip channel={o.channel} /></td>
                  <td className="p-3">{o.customer}</td>
                  <td className="p-3 text-right tabular">{o.items}</td>
                  <td className="p-3 text-right tabular font-medium">{fmt(o.total)}</td>
                  <td className="p-3"><StatusPill status={o.status} /></td>
                  <td className="p-3 tabular text-[11px] text-[var(--fg-muted)]">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
