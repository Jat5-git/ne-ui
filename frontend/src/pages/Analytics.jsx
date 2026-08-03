import React, { useState, useMemo } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { REVENUE_TREND } from "@/data/seed";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Filter, Download, Columns3, RefreshCw, ChevronDown, Calendar } from "lucide-react";
import { toast } from "sonner";
import SearchableSelect from "@/components/SearchableSelect";
import AdvancedFilterPanel, { applyFilters } from "@/components/AdvancedFilterPanel";

const COLORS = { amazon: "#FF9900", shopify: "#7AB55C", flipkart: "#2874F0", woocommerce: "#7F54B3" };
const fmt = (n) => "₹" + (n || 0).toLocaleString("en-IN");

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

// Stock removed — Analytics is confirmed-orders only. Stock lives on Listings & Channels.
const REPORTS = {
  listings: {
    label: "Listings by Channel",
    cols: [
      { key: "master_sku",  label: "Master SKU",    type: "string" },
      { key: "title",       label: "Title",         type: "string" },
      { key: "channel",     label: "Channel",       type: "string" },
      { key: "channel_sku", label: "Channel SKU",   type: "string" },
      { key: "status",      label: "Status",        type: "string" },
      { key: "price",       label: "Price",         type: "number", num: true },
      { key: "units_sold",  label: "Sold (range)",  type: "number", num: true },
      { key: "revenue",     label: "Revenue (range)", type: "number", num: true, money: true },
      { key: "last_synced", label: "Last Sync",     type: "date" },
    ],
  },
  revenue: {
    label: "Revenue by Order",
    cols: [
      { key: "channel_order_id", label: "Order ID",     type: "string" },
      { key: "channel",          label: "Channel",      type: "string" },
      { key: "customer",         label: "Customer",     type: "string" },
      { key: "status",           label: "Status",       type: "string" },
      { key: "units",            label: "Units",        type: "number", num: true },
      { key: "gross",            label: "Gross",        type: "number", num: true, money: true },
      { key: "revenue_state",    label: "Revenue State",type: "string" },
      { key: "date",             label: "Date",         type: "date" },
    ],
  },
  channel_summary: {
    label: "Channel Summary",
    cols: [
      { key: "channel",   label: "Channel",       type: "string" },
      { key: "listings",  label: "Listings",      type: "number", num: true },
      { key: "units",     label: "Units Sold",    type: "number", num: true },
      { key: "pending",   label: "Pending Rev",   type: "number", num: true, money: true },
      { key: "confirmed", label: "Confirmed Rev", type: "number", num: true, money: true },
      { key: "refunded",  label: "Refunded",      type: "number", num: true, money: true },
      { key: "net",       label: "Net Revenue",   type: "number", num: true, money: true },
    ],
  },
};

export default function Analytics() {
  const { listings, channels, products, orders, returns, revenueSummary, revenueByChannel, orderTotal, orderQty, soldForListingInRange } = useStore();

  // ==== Global Date Range (drives entire preview) ====
  const [dateFrom, setDateFrom] = useState(daysAgo(30));
  const [dateTo, setDateTo]     = useState(today());

  const [reportType, setReportType] = useState("listings");
  const cfg = REPORTS[reportType];
  const [selectedCols, setSelectedCols] = useState(cfg.cols.map(c => c.key));

  const [flChannels, setFlChannels] = useState(new Set(channels.map(c => c.key)));
  const [flStatus, setFlStatus]     = useState("all");

  // Advanced filter state
  const [advOpen, setAdvOpen]       = useState(true);
  const [advFilters, setAdvFilters] = useState([]);
  const [advMatch, setAdvMatch]     = useState("all");

  const [colsOpen, setColsOpen] = useState(false);

  const onReportChange = (t) => { setReportType(t); setSelectedCols(REPORTS[t].cols.map(c => c.key)); setFlStatus("all"); setAdvFilters([]); };
  const toggleChannel = (k) => setFlChannels(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleCol = (k) => setSelectedCols(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const rawRows = useMemo(() => {
    if (reportType === "listings") {
      return listings.filter(l => {
        if (!flChannels.has(l.channel)) return false;
        if (flStatus !== "all" && l.status !== flStatus) return false;
        return true;
      }).map(l => {
        const { units, revenue } = soldForListingInRange(l.master_id, l.channel, dateFrom, dateTo);
        return { master_sku: l.master_sku, title: l.title, channel: l.channel, channel_sku: l.channel_sku, status: l.status, price: l.price, units_sold: units, revenue, last_synced: l.last_synced };
      });
    }
    if (reportType === "revenue") {
      return orders.filter(o => {
        if (!flChannels.has(o.channel)) return false;
        if (flStatus !== "all" && o.status !== flStatus) return false;
        if (dateFrom && o.date < dateFrom) return false;
        if (dateTo && o.date > dateTo) return false;
        return true;
      }).map(o => {
        const state = ["placed","processing","shipped"].includes(o.status) ? "Pending" : o.status === "delivered" ? "Confirmed" : o.status === "returned" ? "Reversed" : "Excluded";
        return { channel_order_id: o.channel_order_id, channel: o.channel, customer: o.customer, status: o.status, units: orderQty(o), gross: orderTotal(o), revenue_state: state, date: o.date };
      });
    }
    if (reportType === "channel_summary") {
      return channels.filter(c => flChannels.has(c.key)).map(c => {
        // Recompute channel totals against the selected date range
        let pending = 0, confirmed = 0, refunded = 0, units = 0;
        orders.forEach(o => {
          if (o.channel !== c.key) return;
          if (dateFrom && o.date < dateFrom) return;
          if (dateTo && o.date > dateTo) return;
          const t = orderTotal(o), q = orderQty(o);
          if (["placed","processing","shipped"].includes(o.status)) { pending += t; units += q; }
          else if (o.status === "delivered") { confirmed += t; units += q; }
        });
        returns.forEach(r => {
          if (r.channel !== c.key || r.status !== "refunded") return;
          if (dateFrom && r.date < dateFrom) return;
          if (dateTo && r.date > dateTo) return;
          refunded += (r.line_items || []).reduce((s, li) => s + li.refund_amount, 0);
        });
        return { channel: c.name, listings: listings.filter(l => l.channel === c.key).length, units, pending, confirmed, refunded, net: confirmed - refunded };
      });
    }
    return [];
  }, [reportType, listings, orders, returns, channels, flChannels, flStatus, dateFrom, dateTo, soldForListingInRange, orderTotal, orderQty]);

  const rows = useMemo(() => applyFilters(rawRows, advFilters, advMatch, Object.fromEntries(cfg.cols.map(c => [c.key, c]))), [rawRows, advFilters, advMatch, cfg]);

  const exportCsv = () => {
    if (rows.length === 0) { toast.error("Nothing to export — adjust filters"); return; }
    const useCols = cfg.cols.filter(c => selectedCols.includes(c.key));
    const header = useCols.map(c => `"${c.label.replace(/"/g, '""')}"`).join(",");
    const body = rows.map(r => useCols.map(c => {
      const v = r[c.key]; if (v === null || v === undefined) return "";
      if (typeof v === "number") return v;
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(",")).join("\n");
    const csv = header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${reportType}_${dateFrom}_to_${dateTo}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} rows to CSV`);
  };

  const resetFilters = () => { setFlChannels(new Set(channels.map(c => c.key))); setFlStatus("all"); setAdvFilters([]); setDateFrom(daysAgo(30)); setDateTo(today()); };

  const uniqueBrands = Array.from(new Set(products.map(p => p.brand)));
  const uniqueCategories = Array.from(new Set(products.map(p => p.category)));
  const statusOptions = {
    listings: ["all", "active", "paused", "error"],
    revenue: ["all", "placed", "processing", "shipped", "delivered", "cancelled", "returned"],
    channel_summary: ["all"],
  }[reportType];

  const useCols = cfg.cols.filter(c => selectedCols.includes(c.key));

  // Top-KPI summary for the picked range
  const rangeSummary = useMemo(() => {
    let confirmed = 0, pending = 0, refunded = 0, unitsDelivered = 0;
    orders.forEach(o => {
      if (dateFrom && o.date < dateFrom) return;
      if (dateTo && o.date > dateTo) return;
      const t = orderTotal(o), q = orderQty(o);
      if (["placed","processing","shipped"].includes(o.status)) pending += t;
      else if (o.status === "delivered") { confirmed += t; unitsDelivered += q; }
    });
    returns.forEach(r => {
      if (r.status !== "refunded") return;
      if (dateFrom && r.date < dateFrom) return;
      if (dateTo && r.date > dateTo) return;
      refunded += (r.line_items || []).reduce((s, li) => s + li.refund_amount, 0);
    });
    return { confirmed, pending, refunded, net: confirmed - refunded, unitsDelivered };
  }, [orders, returns, dateFrom, dateTo, orderTotal, orderQty]);

  return (
    <>
      <Topbar title="Analytics" breadcrumb="Overview" subtitle="All numbers below reflect your chosen date range. Stock lives on Listings & Channels." />
      <div className="px-8 py-6 space-y-6">

        {/* GLOBAL DATE RANGE (drives everything) */}
        <div className="border-2 border-[var(--primary)] bg-[#F0F4FF] p-4 flex items-center gap-4 flex-wrap" data-testid="date-range-banner">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[var(--primary)]" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Date Range · Global filter</div>
              <div className="font-display font-black text-[14px] tracking-tight">Every metric below is scoped to this range</div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <label className="text-[11px] font-medium text-[var(--fg-muted)]">From</label>
            <input type="date" data-testid="dr-from" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-[var(--border)] px-2 py-1.5 text-[12px] tabular bg-white" />
            <label className="text-[11px] font-medium text-[var(--fg-muted)]">To</label>
            <input type="date" data-testid="dr-to"   value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="border border-[var(--border)] px-2 py-1.5 text-[12px] tabular bg-white" />
            <div className="flex border border-[var(--border)] divide-x divide-[var(--border)] bg-white">
              {[[7, "7d"], [30, "30d"], [90, "90d"], [365, "1y"]].map(([n, label]) => (
                <button key={n} data-testid={`dr-preset-${label}`} onClick={() => { setDateFrom(daysAgo(n)); setDateTo(today()); }} className="px-2.5 py-1.5 text-[11px] hover:bg-[var(--surface)]">{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Range KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 border border-[var(--border)]">
          <div className="p-4 border-r border-[var(--border)]" data-testid="rs-confirmed"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Confirmed</div><div className="text-2xl font-display font-black tabular mt-1 text-[var(--success)]">{fmt(rangeSummary.confirmed)}</div></div>
          <div className="p-4 border-r border-[var(--border)]" data-testid="rs-pending"  ><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Pending</div>  <div className="text-2xl font-display font-black tabular mt-1 text-[var(--warning)]">{fmt(rangeSummary.pending)}</div></div>
          <div className="p-4 border-r border-[var(--border)]" data-testid="rs-refunded" ><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Refunded</div> <div className="text-2xl font-display font-black tabular mt-1 text-[var(--danger)]">−{fmt(rangeSummary.refunded)}</div></div>
          <div className="p-4 border-r border-[var(--border)]" data-testid="rs-net"      ><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Net</div>      <div className="text-2xl font-display font-black tabular mt-1">{fmt(rangeSummary.net)}</div></div>
          <div className="p-4" data-testid="rs-units"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Units Delivered</div><div className="text-2xl font-display font-black tabular mt-1">{rangeSummary.unitsDelivered}</div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-[var(--border)] p-6 bg-white">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Revenue Trend</div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={REVENUE_TREND}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#002FA7" stopOpacity={0.3} /><stop offset="100%" stopColor="#002FA7" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#E5E7EB" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="amazon" stroke="#002FA7" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="border border-[var(--border)] p-6 bg-white">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Net Revenue by Channel</div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={channels.map(c => ({ name: c.name.split(" ")[0], value: revenueByChannel[c.key]?.net || 0, color: COLORS[c.key] }))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {channels.map((c, i) => <Cell key={i} fill={COLORS[c.key]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Report Builder */}
        <div className="border border-[var(--border)] bg-white" data-testid="report-builder">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold flex items-center gap-1.5"><Filter size={11} />Custom Report Builder</div>
              <div className="font-display text-lg font-black tracking-tight mt-0.5">Filter · Customize · Export</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={resetFilters} className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-white flex items-center gap-1.5" data-testid="rb-reset"><RefreshCw size={12} />Reset</button>
              <button onClick={exportCsv} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5" data-testid="rb-export"><Download size={12} />Export CSV</button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold block mb-1">Report Type</label>
                <SearchableSelect value={reportType} onChange={onReportChange} options={Object.entries(REPORTS).map(([k, v]) => ({ value: k, label: v.label }))} testid="rb-type" size="md" className="min-w-[220px]" />
              </div>
              <div className="relative">
                <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold block mb-1">Columns ({selectedCols.length}/{cfg.cols.length})</label>
                <button onClick={() => setColsOpen(v => !v)} data-testid="rb-cols-btn" className="border border-[var(--border)] px-2.5 py-1.5 text-[13px] bg-white flex items-center gap-2 min-w-[180px] justify-between">
                  <span className="flex items-center gap-1.5"><Columns3 size={12} />Choose columns</span>
                  <ChevronDown size={12} className={colsOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
                {colsOpen && (
                  <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-[var(--border)] shadow-lg min-w-[220px] p-2 max-h-64 overflow-y-auto" data-testid="rb-cols-menu">
                    {cfg.cols.map(c => (
                      <label key={c.key} className="flex items-center gap-2 px-2 py-1 text-[12px] hover:bg-[var(--surface)] cursor-pointer">
                        <input type="checkbox" checked={selectedCols.includes(c.key)} onChange={() => toggleCol(c.key)} data-testid={`rb-col-${c.key}`} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="ml-auto text-[12px] text-[var(--fg-muted)] tabular self-end pb-1.5">{rows.length} rows</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-[var(--border)]">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold block mb-1">Channels</label>
                <div className="flex flex-wrap gap-1.5">
                  {channels.map(c => (
                    <button key={c.key} onClick={() => toggleChannel(c.key)} data-testid={`rb-ch-${c.key}`} className={`px-2 py-1 text-[11px] border transition-colors ${flChannels.has(c.key) ? "bg-[var(--fg)] text-white border-[var(--fg)]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}>{c.key}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold block mb-1">Status</label>
                <SearchableSelect value={flStatus} onChange={setFlStatus} options={statusOptions.map(s => ({ value: s, label: s }))} testid="rb-status" />
              </div>
              <div className="text-[11px] text-[var(--fg-muted)] self-end pb-1.5">Report auto-scoped by the Date Range banner above.</div>
            </div>

            {/* Advanced filter (highly visible now — starts open) */}
            <AdvancedFilterPanel fields={cfg.cols} filters={advFilters} setFilters={setAdvFilters} match={advMatch} setMatch={setAdvMatch} open={advOpen} setOpen={setAdvOpen} testidPrefix="adv" />

            {/* Preview Table */}
            <div className="border border-[var(--border)] overflow-x-auto" data-testid="rb-preview">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--surface)]">
                  <tr className="border-b border-[var(--border)]">
                    {useCols.map(c => (<th key={c.key} className={`px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium ${c.num ? "text-right" : "text-left"}`}>{c.label}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 40).map((r, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)]">
                      {useCols.map(c => (<td key={c.key} className={`px-3 py-1.5 ${c.num ? "text-right tabular" : ""}`}>{c.money && typeof r[c.key] === "number" ? fmt(r[c.key]) : String(r[c.key] ?? "")}</td>))}
                    </tr>
                  ))}
                  {rows.length === 0 && (<tr><td colSpan={useCols.length} className="px-3 py-6 text-center text-[var(--fg-muted)]">No rows match — adjust filters or date range.</td></tr>)}
                </tbody>
              </table>
              {rows.length > 40 && <div className="px-3 py-2 text-[11px] text-[var(--fg-muted)] bg-[var(--surface)] border-t border-[var(--border)]">Showing 40 of {rows.length} rows · export CSV for full dataset</div>}
            </div>
          </div>
        </div>

        <div className="border border-[var(--border)] p-6 bg-white">
          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Units Delivered by Channel · Range</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={channels.map(c => ({ name: c.name.split(" ")[0], units: rows.filter(r => r.channel === c.key || r.channel === c.name).reduce((s, r) => s + (r.units || r.units_sold || 0), 0) }))}>
              <CartesianGrid strokeDasharray="2 2" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="units" fill="#0A0A0A" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
