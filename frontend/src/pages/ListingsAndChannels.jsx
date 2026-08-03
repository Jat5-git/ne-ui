import React, { useState, useMemo } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";
import { Search, ExternalLink, RefreshCw, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

export default function ListingsAndChannels() {
  const { listings, channels } = useStore();
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => listings.filter(l => {
    if (channelFilter !== "all" && l.channel !== channelFilter) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (query && !l.title.toLowerCase().includes(query.toLowerCase()) && !l.master_sku.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [listings, query, channelFilter, statusFilter]);

  const activeCount = listings.filter(l => l.status === "active").length;
  const errCount = listings.filter(l => l.status === "error").length;
  const oosCount = listings.filter(l => l.stock === 0).length;
  const totalRev = listings.reduce((s, l) => s + l.revenue_30d, 0);

  const syncAll = () => {
    toast.success("Sync initiated across all channels", { description: `${listings.length} listings will update in the next 30s.` });
  };

  return (
    <>
      <Topbar
        title="Listings & Channels"
        breadcrumb="Operations · Multi-Channel Execution"
        subtitle="Every SKU that's live somewhere. Drill in for channel-specific overrides."
        actions={
          <button data-testid="sync-all-btn" onClick={syncAll} className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5 transition-colors">
            <RefreshCw size={13} />Sync All Now
          </button>
        }
      />

      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 border border-[var(--border)]">
          <div className="p-4 border-r border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Total Active</div>
            <div className="text-2xl font-display font-black tabular mt-1">{activeCount}</div>
          </div>
          <div className="p-4 border-r border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Out of Stock</div>
            <div className={`text-2xl font-display font-black tabular mt-1 ${oosCount > 0 ? "text-[var(--danger)]" : ""}`}>{oosCount}</div>
          </div>
          <div className="p-4 border-r border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Revenue (30d)</div>
            <div className="text-2xl font-display font-black tabular mt-1">{fmt(totalRev)}</div>
          </div>
          <div className={`p-4 ${errCount > 0 ? "bg-[#FDECEA]" : ""}`}>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold flex items-center gap-1">Sync Errors {errCount > 0 && <AlertTriangle size={11} className="text-[var(--danger)]" />}</div>
            <div className={`text-2xl font-display font-black tabular mt-1 ${errCount > 0 ? "text-[var(--danger)]" : ""}`}>{errCount}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-[var(--border)] px-2.5 py-1.5 flex-1 max-w-md">
            <Search size={13} className="text-[var(--fg-muted)]" />
            <input data-testid="listings-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title or SKU…" className="flex-1 text-[13px] outline-none bg-transparent" />
          </div>
          <div className="flex items-center border border-[var(--border)] divide-x divide-[var(--border)]">
            <button data-testid="lf-all" onClick={() => setChannelFilter("all")} className={`px-3 py-1.5 text-[12px] transition-colors ${channelFilter === "all" ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}>All Channels</button>
            {channels.map(c => (
              <button key={c.key} data-testid={`lf-${c.key}`} onClick={() => setChannelFilter(c.key)} className={`px-3 py-1.5 text-[12px] capitalize transition-colors ${channelFilter === c.key ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}>{c.key}</button>
            ))}
          </div>
          <select data-testid="lf-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-[var(--border)] px-2.5 py-1.5 text-[12px] bg-white">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
          </select>
          <div className="ml-auto text-[12px] text-[var(--fg-muted)] tabular">{filtered.length} listings</div>
        </div>

        <div className="border border-[var(--border)] bg-white overflow-x-auto">
          <table className="w-full text-[13px]" data-testid="listings-table">
            <thead className="bg-[var(--surface)]">
              <tr className="border-b border-[var(--border)]">
                <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Product</th>
                <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Master SKU</th>
                <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Channel</th>
                <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Channel SKU</th>
                <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Status</th>
                <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Stock</th>
                <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Price</th>
                <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Sold 30d</th>
                <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Last Sync</th>
                <th className="p-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="border-b border-[var(--border)] last:border-b-0 row-hover" data-testid={`listing-row-${l.id}`}>
                  <td className="p-3">
                    <Link to={`/listings/${l.id}`} className="flex items-center gap-3 hover:text-[var(--primary)]">
                      <img src={l.image} alt="" className="w-8 h-8 object-cover border border-[var(--border)]" />
                      <div className="font-medium truncate max-w-[220px]">{l.title}</div>
                    </Link>
                  </td>
                  <td className="p-3 tabular text-[12px]">{l.master_sku}</td>
                  <td className="p-3"><ChannelChip channel={l.channel} /></td>
                  <td className="p-3 tabular text-[12px] text-[var(--fg-muted)]">{l.channel_sku}</td>
                  <td className="p-3"><StatusPill status={l.status} /></td>
                  <td className={`p-3 text-right tabular ${l.stock === 0 ? "text-[var(--danger)] font-medium" : ""}`}>{l.stock}</td>
                  <td className="p-3 text-right tabular font-medium">{fmt(l.price)}</td>
                  <td className="p-3 text-right tabular">{l.units_sold_30d}</td>
                  <td className="p-3 tabular text-[11px] text-[var(--fg-muted)]">{l.last_synced}</td>
                  <td className="p-3">
                    <Link to={`/listings/${l.id}`} className="p-1 hover:bg-[var(--surface-2)] block" data-testid={`open-${l.id}`}>
                      <ExternalLink size={13} className="text-[var(--fg-muted)]" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="p-12 text-center text-[13px] text-[var(--fg-muted)]">No listings match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
