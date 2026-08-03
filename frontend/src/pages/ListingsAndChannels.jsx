import React, { useState, useMemo } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";
import { Search, ExternalLink, RefreshCw, AlertTriangle, ChevronRight, LayoutGrid, Rows3 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

export default function ListingsAndChannels() {
  const { listings, channels, effectiveStock, products } = useStore();
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState("grouped");
  const [expanded, setExpanded] = useState(new Set());

  const enriched = useMemo(() => listings.map(l => ({ ...l, live_stock: effectiveStock(l) })), [listings, effectiveStock]);

  const filtered = useMemo(() => enriched.filter(l => {
    if (channelFilter !== "all" && l.channel !== channelFilter) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (query && !l.title.toLowerCase().includes(query.toLowerCase()) && !l.master_sku.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [enriched, query, channelFilter, statusFilter]);

  // Group by master_sku — one row per unique product
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach(l => {
      const key = l.master_sku;
      if (!map.has(key)) {
        const product = products.find(p => p.id === l.master_id);
        map.set(key, {
          master_sku: l.master_sku,
          master_id: l.master_id,
          title: l.title,
          image: l.image,
          stock_mode: product?.stock_mode || "central",
          master_pool: product?.stock || 0,
          rows: [],
        });
      }
      map.get(key).rows.push(l);
    });
    return Array.from(map.values()).map(g => {
      // In central mode, total stock is the master pool (not the sum of duplicated pool numbers).
      const totalStock = g.stock_mode === "central" ? g.master_pool : g.rows.reduce((s, r) => s + r.live_stock, 0);
      const totalRev = g.rows.reduce((s, r) => s + r.revenue_30d, 0);
      const totalUnits = g.rows.reduce((s, r) => s + r.units_sold_30d, 0);
      const errorCount = g.rows.filter(r => r.status === "error").length;
      const activeCount = g.rows.filter(r => r.status === "active").length;
      const pausedCount = g.rows.filter(r => r.status === "paused").length;
      const oosCount = g.rows.filter(r => r.live_stock === 0).length;
      const priceMin = Math.min(...g.rows.map(r => r.price));
      const priceMax = Math.max(...g.rows.map(r => r.price));
      const lastSync = g.rows.map(r => r.last_synced).sort().reverse()[0];
      return { ...g, totalStock, totalRev, totalUnits, errorCount, activeCount, pausedCount, oosCount, priceMin, priceMax, lastSync };
    });
  }, [filtered, products]);

  const toggleExpand = (sku) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(sku) ? n.delete(sku) : n.add(sku);
      return n;
    });
  };

  const expandAll = () => setExpanded(new Set(grouped.map(g => g.master_sku)));
  const collapseAll = () => setExpanded(new Set());

  const activeCount = enriched.filter(l => l.status === "active").length;
  const errCount = enriched.filter(l => l.status === "error").length;
  const oosCount = enriched.filter(l => l.live_stock === 0).length;
  const totalRev = enriched.reduce((s, l) => s + l.revenue_30d, 0);

  const syncAll = () => {
    toast.success("Sync initiated across all channels", { description: `${listings.length} listings will update in the next 30s.` });
  };

  return (
    <>
      <Topbar
        title="Listings & Channels"
        breadcrumb="Operations · Multi-Channel Execution"
        subtitle="One row per master product. Expand to see channel-level detail & overrides."
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
          <div className="flex items-center border border-[var(--border)] divide-x divide-[var(--border)]">
            <button data-testid="view-grouped" onClick={() => setView("grouped")} className={`px-2.5 py-1.5 text-[12px] flex items-center gap-1 transition-colors ${view === "grouped" ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}><LayoutGrid size={12} />Grouped</button>
            <button data-testid="view-flat" onClick={() => setView("flat")} className={`px-2.5 py-1.5 text-[12px] flex items-center gap-1 transition-colors ${view === "flat" ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}><Rows3 size={12} />Flat</button>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-[12px] text-[var(--fg-muted)] tabular">{view === "grouped" ? `${grouped.length} products · ${filtered.length} listings` : `${filtered.length} listings`}</div>
            {view === "grouped" && (
              <div className="flex items-center gap-1 text-[11px]">
                <button data-testid="expand-all" onClick={expandAll} className="text-[var(--primary)] hover:underline">Expand all</button>
                <span className="text-[var(--fg-muted)]">·</span>
                <button data-testid="collapse-all" onClick={collapseAll} className="text-[var(--primary)] hover:underline">Collapse</button>
              </div>
            )}
          </div>
        </div>

        {view === "grouped" ? (
          <div className="border border-[var(--border)] bg-white overflow-x-auto">
            <table className="w-full text-[13px]" data-testid="listings-grouped-table">
              <thead className="bg-[var(--surface)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="p-3 w-8"></th>
                  <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Product</th>
                  <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Master SKU</th>
                  <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Channels</th>
                  <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Stock</th>
                  <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Price Range</th>
                  <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Sold 30d</th>
                  <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Revenue 30d</th>
                  <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(g => {
                  const isOpen = expanded.has(g.master_sku);
                  return (
                    <React.Fragment key={g.master_sku}>
                      <tr
                        className="border-b border-[var(--border)] cursor-pointer hover:bg-[var(--surface)] transition-colors"
                        onClick={() => toggleExpand(g.master_sku)}
                        data-testid={`group-row-${g.master_sku}`}
                      >
                        <td className="p-3 text-center">
                          <ChevronRight size={14} className={`text-[var(--fg-muted)] transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img src={g.image} alt="" className="w-9 h-9 object-cover border border-[var(--border)]" />
                              {(() => {
                                const prod = products.find(p => p.id === g.master_id);
                                const imgCount = (prod?.images || []).length;
                                return imgCount > 1 ? (
                                  <span className="absolute -top-1 -right-1 bg-[var(--fg)] text-white text-[9px] px-1 tabular font-medium" title={`${imgCount} images`}>{imgCount}</span>
                                ) : null;
                              })()}
                            </div>
                            <Link to={`/products/${g.master_id}`} onClick={e => e.stopPropagation()} data-testid={`group-product-link-${g.master_sku}`} className="font-medium hover:text-[var(--primary)] hover:underline transition-colors truncate max-w-[240px]">{g.title}</Link>
                          </div>
                        </td>
                        <td className="p-3 tabular text-[12px] font-medium">{g.master_sku}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {g.rows.map(r => (
                              <div key={r.id} className="relative" title={`${r.channel_label}: ${r.status}`}>
                                <ChannelChip channel={r.channel} />
                                {r.status === "error" && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--danger)]"></span>}
                                {r.status === "paused" && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--warning)]"></span>}
                              </div>
                            ))}
                            <span className="text-[11px] text-[var(--fg-muted)] tabular ml-1">{g.rows.length}</span>
                            <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 border text-[9px] uppercase tracking-widest font-medium ${g.stock_mode === "central" ? "border-[var(--border)] text-[var(--fg-muted)]" : "border-[var(--primary)] text-[var(--primary)] bg-[#F0F4FF]"}`} title={g.stock_mode === "central" ? "Central Pool: shared stock" : "Allocated: dedicated per channel"}>
                              {g.stock_mode === "central" ? "POOL" : "SPLIT"}
                            </span>
                          </div>
                          {(g.errorCount > 0 || g.pausedCount > 0 || g.oosCount > 0) && (
                            <div className="flex gap-1.5 mt-1.5 text-[10px]">
                              {g.errorCount > 0 && <span className="text-[var(--danger)]">● {g.errorCount} error</span>}
                              {g.pausedCount > 0 && <span className="text-[var(--warning)]">● {g.pausedCount} paused</span>}
                              {g.oosCount > 0 && <span className="text-[var(--danger)]">● {g.oosCount} OOS</span>}
                            </div>
                          )}
                        </td>
                        <td className={`p-3 text-right tabular font-medium ${g.totalStock === 0 ? "text-[var(--danger)]" : ""}`}>{g.totalStock}</td>
                        <td className="p-3 text-right tabular text-[12px]">
                          {g.priceMin === g.priceMax ? fmt(g.priceMin) : <span className="text-[var(--fg-muted)]">{fmt(g.priceMin)} — {fmt(g.priceMax)}</span>}
                        </td>
                        <td className="p-3 text-right tabular">{g.totalUnits}</td>
                        <td className="p-3 text-right tabular font-medium">{fmt(g.totalRev)}</td>
                        <td className="p-3 tabular text-[11px] text-[var(--fg-muted)]">{g.lastSync}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[#FAFAFA]">
                          <td colSpan={9} className="px-0 py-0 border-b border-[var(--border)]">
                            <div className="pl-12 pr-6 py-2">
                              <table className="w-full text-[12px]">
                                <thead>
                                  <tr className="border-b border-[var(--border)]">
                                    <th className="py-2 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channel</th>
                                    <th className="py-2 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channel SKU</th>
                                    <th className="py-2 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Status</th>
                                    <th className="py-2 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Stock</th>
                                    <th className="py-2 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Price</th>
                                    <th className="py-2 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Sold 30d</th>
                                    <th className="py-2 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Revenue 30d</th>
                                    <th className="py-2 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Last Sync</th>
                                    <th className="py-2 w-8"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.rows.map(r => (
                                    <tr key={r.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-white" data-testid={`sub-row-${r.id}`}>
                                      <td className="py-2"><ChannelChip channel={r.channel} /></td>
                                      <td className="py-2 tabular text-[11px] text-[var(--fg-muted)]">{r.channel_sku}</td>
                                      <td className="py-2"><StatusPill status={r.status} /></td>
                                      <td className={`py-2 text-right tabular ${r.live_stock === 0 ? "text-[var(--danger)] font-medium" : ""}`}>
                                        {r.live_stock}
                                        {g.stock_mode === "central" && <span className="ml-1 text-[9px] text-[var(--fg-muted)] uppercase tracking-widest">shared</span>}
                                      </td>
                                      <td className="py-2 text-right tabular font-medium">{fmt(r.price)}</td>
                                      <td className="py-2 text-right tabular">{r.units_sold_30d}</td>
                                      <td className="py-2 text-right tabular">{fmt(r.revenue_30d)}</td>
                                      <td className="py-2 tabular text-[10px] text-[var(--fg-muted)]">{r.last_synced}</td>
                                      <td className="py-2">
                                        <Link to={`/listings/${r.id}`} className="p-1 hover:bg-[var(--surface-2)] block" onClick={e => e.stopPropagation()} data-testid={`open-${r.id}`}>
                                          <ExternalLink size={12} className="text-[var(--fg-muted)]" />
                                        </Link>
                                      </td>
                                    </tr>                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {grouped.length === 0 && (
                  <tr><td colSpan={9} className="p-12 text-center text-[13px] text-[var(--fg-muted)]">No listings match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-[var(--border)] bg-white overflow-x-auto">
            <table className="w-full text-[13px]" data-testid="listings-flat-table">
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
                      <Link to={`/products/${l.master_id}`} data-testid={`flat-product-link-${l.id}`} className="flex items-center gap-3 hover:text-[var(--primary)]">
                        <img src={l.image} alt="" className="w-8 h-8 object-cover border border-[var(--border)]" />
                        <div className="font-medium truncate max-w-[220px] hover:underline">{l.title}</div>
                      </Link>
                    </td>
                    <td className="p-3 tabular text-[12px]">{l.master_sku}</td>
                    <td className="p-3"><ChannelChip channel={l.channel} /></td>
                    <td className="p-3 tabular text-[12px] text-[var(--fg-muted)]">{l.channel_sku}</td>
                    <td className="p-3"><StatusPill status={l.status} /></td>
                    <td className={`p-3 text-right tabular ${l.live_stock === 0 ? "text-[var(--danger)] font-medium" : ""}`}>{l.live_stock}</td>
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
        )}
      </div>
    </>
  );
}
