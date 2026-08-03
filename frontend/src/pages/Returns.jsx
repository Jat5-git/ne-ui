import React from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";

export default function Returns() {
  const { returns } = useStore();
  return (
    <>
      <Topbar title="Returns" breadcrumb="Operations" subtitle="Cross-channel returns & refunds." />
      <div className="px-8 py-6">
        <div className="border border-[var(--border)] bg-white overflow-x-auto">
          <table className="w-full text-[13px]" data-testid="returns-table">
            <thead className="bg-[var(--surface)]">
              <tr className="border-b border-[var(--border)]">
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Return ID</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Order</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channel</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">SKU</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Reason</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Status</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-b-0 row-hover" data-testid={`return-${r.id}`}>
                  <td className="p-3 tabular">{r.id}</td>
                  <td className="p-3 tabular text-[12px]">{r.order_id}</td>
                  <td className="p-3"><ChannelChip channel={r.channel} /></td>
                  <td className="p-3 tabular text-[12px]">{r.sku}</td>
                  <td className="p-3">{r.reason}</td>
                  <td className="p-3"><StatusPill status={r.status} /></td>
                  <td className="p-3 tabular text-[11px] text-[var(--fg-muted)]">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
