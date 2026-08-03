import React, { useState, useMemo } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { REVENUE_TREND } from "@/data/seed";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Filter, Download, Columns3, RefreshCw, ChevronDown, Plus, X, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import SearchableSelect from "@/components/SearchableSelect";

const COLORS = { amazon: "#FF9900", shopify: "#7AB55C", flipkart: "#2874F0", woocommerce: "#7F54B3" };

const fmt = (n) => "₹" + (n || 0).toLocaleString("en-IN");

// -------- Report Builder config: source datasets & their available columns --------
const REPORTS = {
  listings: {
    label: "Listings by Channel",
    cols: [
      { key: "master_sku", label: "Master SKU" },
      { key: "title", label: "Title" },
      { key: "channel", label: "Channel" },
      { key: "channel_sku", label: "Channel SKU" },
      { key: "status", label: "Status" },
      { key: "price", label: "Price", num: true },
      { key: "stock", label: "Stock", num: true },
      { key: "blocked", label: "Blocked", num: true },
      { key: "available", label: "Available", num: true },
      { key: "units_sold_30d", label: "Sold (30d)", num: true },
      { key: "revenue_30d", label: "Revenue (30d)", num: true, money: true },
      { key: "last_synced", label: "Last Sync" },
    ],
  },
  revenue: {
    label: "Revenue by Order",
    cols: [
      { key: "channel_order_id", label: "Order ID" },
      { key: "channel", label: "Channel" },
      { key: "customer", label: "Customer" },
      { key: "status", label: "Status" },
      { key: "units", label: "Units", num: true },
      { key: "gross", label: "Gross", num: true, money: true },
      { key: "revenue_state", label: "Revenue State" },
      { key: "date", label: "Date" },
    ],
  },
  stock: {
    label: "Stock by Product",
    cols: [
      { key: "sku", label: "Master SKU" },
      { key: "title", label: "Title" },
      { key: "brand", label: "Brand" },
      { key: "category", label: "Category" },
      { key: "stock_mode", label: "Mode" },
      { key: "stock", label: "On-hand", num: true },
      { key: "blocked", label: "Blocked", num: true },
      { key: "available", label: "Available", num: true },
      { key: "channels_count", label: "Channels", num: true },
      { key: "status", label: "Status" },
    ],
  },
  channel_summary: {
    label: "Channel Summary",
    cols: [
      { key: "channel", label: "Channel" },
      { key: "listings", label: "Listings", num: true },
      { key: "units", label: "Units Sold", num: true },
      { key: "pending", label: "Pending Rev", num: true, money: true },
      { key: "confirmed", label: "Confirmed Rev", num: true, money: true },
      { key: "refunded", label: "Refunded", num: true, money: true },
      { key: "net", label: "Net Revenue", num: true, money: true },
    ],
  },
};

export default function Analytics() {
  const store = useStore();
  const { listings, channels, products, orders, returns, revenueSummary, revenueByChannel, blockedForProduct, availableStock, blockedForChannel, availableForListing, orderTotal, orderQty } = store;

  // ---- Report Builder state ----
  const [reportType, setReportType] = useState("listings");
  const cfg = REPORTS[reportType];
  const [selectedCols, setSelectedCols] = useState(cfg.cols.map(c => c.key));
  const [flChannels, setFlChannels] = useState(new Set(channels.map(c => c.key)));
  const [flStatus, setFlStatus] = useState("all");
  const [flBrand, setFlBrand] = useState("all");
  const [flCategory, setFlCategory] = useState("all");
  const [flStockMin, setFlStockMin] = useState("");
  const [flStockMax, setFlStockMax] = useState("");
  const [flDateFrom, setFlDateFrom] = useState("");
  const [flDateTo, setFlDateTo] = useState("");
  const [colsOpen, setColsOpen] = useState(false);

  // Reset columns when report type changes
  const onReportChange = (t) => { setReportType(t); setSelectedCols(REPORTS[t].cols.map(c => c.key)); setFlStatus("all"); setAdvFilters([]); };

  const toggleChannel = (k) => setFlChannels(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleCol = (k) => setSelectedCols(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  // ============= ADVANCED FILTER BUILDER =============
  // Each row: { id, field, operator, value, valueEnd }.
  // Field type inferred from cfg.cols by `num` flag or key heuristic (date keys → date).
  const [advOpen, setAdvOpen] = useState(false);
  const [advFilters, setAdvFilters] = useState([]);
  const [advMatch, setAdvMatch] = useState("all"); // all | any

  const fieldType = (col) => {
    if (!col) return "string";
    if (col.key === "last_synced" || col.key === "date") return "date";
    if (col.num) return "number";
    return "string";
  };
  const opsFor = (type) => {
    if (type === "number") return [{ v: "eq", l: "equals" }, { v: "neq", l: "not equals" }, { v: "gt", l: "greater than" }, { v: "gte", l: "≥" }, { v: "lt", l: "less than" }, { v: "lte", l: "≤" }, { v: "between", l: "between" }, { v: "empty", l: "is empty" }, { v: "notempty", l: "is not empty" }];
    if (type === "date")   return [{ v: "on_or_after", l: "on or after" }, { v: "on_or_before", l: "on or before" }, { v: "between", l: "between" }, { v: "in_last_days", l: "in last N days" }, { v: "empty", l: "is empty" }, { v: "notempty", l: "is not empty" }];
    return [{ v: "contains", l: "contains" }, { v: "not_contains", l: "does not contain" }, { v: "eq", l: "equals" }, { v: "neq", l: "not equals" }, { v: "starts", l: "starts with" }, { v: "ends", l: "ends with" }, { v: "empty", l: "is empty" }, { v: "notempty", l: "is not empty" }];
  };

  const addFilter = () => {
    const firstCol = cfg.cols[0];
    setAdvFilters(prev => [...prev, { id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, field: firstCol.key, operator: opsFor(fieldType(firstCol))[0].v, value: "", valueEnd: "" }]);
  };
  const removeFilter = (id) => setAdvFilters(prev => prev.filter(f => f.id !== id));
  const updateFilter = (id, patch) => setAdvFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  const clearAllFilters = () => setAdvFilters([]);

  const evalRule = (row, f) => {
    const col = cfg.cols.find(c => c.key === f.field);
    const type = fieldType(col);
    const raw = row[f.field];
    const v = raw === null || raw === undefined ? "" : raw;
    const q = f.value; const q2 = f.valueEnd;
    switch (f.operator) {
      case "empty":    return v === "" || v === null || v === undefined;
      case "notempty": return !(v === "" || v === null || v === undefined);
      case "eq":       return type === "number" ? Number(v) === Number(q) : String(v).toLowerCase() === String(q).toLowerCase();
      case "neq":      return type === "number" ? Number(v) !== Number(q) : String(v).toLowerCase() !== String(q).toLowerCase();
      case "contains":     return String(v).toLowerCase().includes(String(q).toLowerCase());
      case "not_contains": return !String(v).toLowerCase().includes(String(q).toLowerCase());
      case "starts":       return String(v).toLowerCase().startsWith(String(q).toLowerCase());
      case "ends":         return String(v).toLowerCase().endsWith(String(q).toLowerCase());
      case "gt":  return Number(v) >  Number(q);
      case "gte": return Number(v) >= Number(q);
      case "lt":  return Number(v) <  Number(q);
      case "lte": return Number(v) <= Number(q);
      case "between":
        if (type === "date") return String(v) >= String(q) && String(v) <= String(q2);
        return Number(v) >= Number(q) && Number(v) <= Number(q2);
      case "on_or_after":  return String(v) >= String(q);
      case "on_or_before": return String(v) <= String(q);
      case "in_last_days": {
        const days = Number(q); if (!days) return true;
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
        try { return new Date(v) >= cutoff; } catch { return false; }
      }
      default: return true;
    }
  };
  const passesAdvanced = (row) => {
    if (advFilters.length === 0) return true;
    if (advMatch === "any") return advFilters.some(f => evalRule(row, f));
    return advFilters.every(f => evalRule(row, f));
  };

  // ---- Build report rows from source ----
  const rawRows = useMemo(() => {
    if (reportType === "listings") {
      return listings.filter(l => {
        if (!flChannels.has(l.channel)) return false;
        if (flStatus !== "all" && l.status !== flStatus) return false;
        const p = products.find(pp => pp.id === l.master_id);
        if (p && flBrand !== "all" && p.brand !== flBrand) return false;
        if (p && flCategory !== "all" && p.category !== flCategory) return false;
        const avail = availableForListing(l);
        if (flStockMin !== "" && avail < Number(flStockMin)) return false;
        if (flStockMax !== "" && avail > Number(flStockMax)) return false;
        return true;
      }).map(l => ({
        master_sku: l.master_sku, title: l.title, channel: l.channel, channel_sku: l.channel_sku, status: l.status,
        price: l.price, stock: l.stock, blocked: blockedForChannel(l.master_id, l.channel), available: availableForListing(l),
        units_sold_30d: l.units_sold_30d, revenue_30d: l.revenue_30d, last_synced: l.last_synced,
      }));
    }
    if (reportType === "revenue") {
      return orders.filter(o => {
        if (!flChannels.has(o.channel)) return false;
        if (flStatus !== "all" && o.status !== flStatus) return false;
        if (flDateFrom && o.date < flDateFrom) return false;
        if (flDateTo && o.date > flDateTo) return false;
        return true;
      }).map(o => {
        const state = ["placed","processing","shipped"].includes(o.status) ? "Pending" : o.status === "delivered" ? "Confirmed" : o.status === "returned" ? "Reversed" : "Excluded";
        return { channel_order_id: o.channel_order_id, channel: o.channel, customer: o.customer, status: o.status, units: orderQty(o), gross: orderTotal(o), revenue_state: state, date: o.date };
      });
    }
    if (reportType === "stock") {
      return products.filter(p => {
        if (flBrand !== "all" && p.brand !== flBrand) return false;
        if (flCategory !== "all" && p.category !== flCategory) return false;
        if (flStatus !== "all" && p.status !== flStatus) return false;
        const avail = availableStock(p.id);
        if (flStockMin !== "" && avail < Number(flStockMin)) return false;
        if (flStockMax !== "" && avail > Number(flStockMax)) return false;
        return true;
      }).map(p => ({
        sku: p.sku, title: p.title, brand: p.brand, category: p.category, stock_mode: p.stock_mode,
        stock: p.stock, blocked: blockedForProduct(p.id), available: availableStock(p.id),
        channels_count: (p.channels || []).length, status: p.status,
      }));
    }
    if (reportType === "channel_summary") {
      return channels.filter(c => flChannels.has(c.key)).map(c => {
        const rev = revenueByChannel[c.key] || { pending: 0, confirmed: 0, refunded: 0, net: 0, units: 0 };
        return {
          channel: c.name, listings: listings.filter(l => l.channel === c.key).length,
          units: rev.units, pending: rev.pending, confirmed: rev.confirmed, refunded: rev.refunded, net: rev.net,
        };
      });
    }
    return [];
  }, [reportType, listings, orders, products, channels, flChannels, flStatus, flBrand, flCategory, flStockMin, flStockMax, flDateFrom, flDateTo, availableForListing, availableStock, blockedForProduct, blockedForChannel, orderTotal, orderQty, revenueByChannel]);

  // Apply advanced filters on top of simple filters
  const rows = useMemo(() => rawRows.filter(passesAdvanced), [rawRows, advFilters, advMatch]);

  // ---- CSV export ----
  const exportCsv = () => {
    if (rows.length === 0) { toast.error("Nothing to export — adjust filters"); return; }
    const useCols = cfg.cols.filter(c => selectedCols.includes(c.key));
    const header = useCols.map(c => `"${c.label.replace(/"/g, '""')}"`).join(",");
    const body = rows.map(r => useCols.map(c => {
      const v = r[c.key];
      if (v === null || v === undefined) return "";
      if (typeof v === "number") return v;
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(",")).join("\n");
    const csv = header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} rows to CSV`);
  };

  const resetFilters = () => { setFlChannels(new Set(channels.map(c => c.key))); setFlStatus("all"); setFlBrand("all"); setFlCategory("all"); setFlStockMin(""); setFlStockMax(""); setFlDateFrom(""); setFlDateTo(""); };

  // ---- Top summary widgets ----
  const byChannel = channels.map((c) => ({
    name: c.name.split(" ")[0], key: c.key, color: COLORS[c.key],
    revenue: (revenueByChannel[c.key]?.confirmed || 0) + (revenueByChannel[c.key]?.pending || 0),
    net: revenueByChannel[c.key]?.net || 0,
    units: revenueByChannel[c.key]?.units || 0,
  }));

  const uniqueBrands = Array.from(new Set(products.map(p => p.brand)));
  const uniqueCategories = Array.from(new Set(products.map(p => p.category)));
  const statusOptions = {
    listings: ["all", "active", "paused", "error"],
    revenue: ["all", "placed", "processing", "shipped", "delivered", "cancelled", "returned"],
    stock: ["all", "listed", "draft", "unlisted"],
    channel_summary: ["all"],
  }[reportType];

  const useCols = cfg.cols.filter(c => selectedCols.includes(c.key));

  return (
    <>
      <Topbar title="Analytics" breadcrumb="Overview" subtitle="Live revenue attribution, stock signals, and a custom report builder." />
      <div className="px-8 py-6 space-y-6">

        {/* Revenue KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[var(--border)]">
          <div className="p-4 border-r border-b lg:border-b-0 border-[var(--border)] bg-[#FFF7E6]" data-testid="an-pending">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Pending Revenue</div>
            <div className="text-2xl font-display font-black tabular mt-1 text-[var(--warning)]">{fmt(revenueSummary.pending)}</div>
          </div>
          <div className="p-4 border-r border-b lg:border-b-0 border-[var(--border)] bg-[#E6F4EA]" data-testid="an-confirmed">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Confirmed Revenue</div>
            <div className="text-2xl font-display font-black tabular mt-1 text-[var(--success)]">{fmt(revenueSummary.confirmed)}</div>
          </div>
          <div className="p-4 border-r border-b sm:border-b-0 border-[var(--border)] bg-[#FDECEA]" data-testid="an-refunded">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Refunded</div>
            <div className="text-2xl font-display font-black tabular mt-1 text-[var(--danger)]">−{fmt(revenueSummary.refunded)}</div>
          </div>
          <div className="p-4" data-testid="an-net">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Net Revenue</div>
            <div className="text-2xl font-display font-black tabular mt-1">{fmt(revenueSummary.net)}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-[var(--border)] p-6 bg-white">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Revenue Trend · 7d</div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={REVENUE_TREND}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#002FA7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#002FA7" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Pie data={byChannel} dataKey="net" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {byChannel.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {byChannel.map(b => (
                <div key={b.name} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2" style={{ background: b.color }}></span>{b.name}
                </div>
              ))}
            </div>
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
            {/* Report type + column picker */}
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

            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-[var(--border)]">
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

              {(reportType === "listings" || reportType === "stock") && (
                <>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold block mb-1">Brand</label>
                    <SearchableSelect value={flBrand} onChange={setFlBrand} options={[{ value: "all", label: "All brands" }, ...uniqueBrands.map(b => ({ value: b, label: b }))]} testid="rb-brand" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold block mb-1">Category</label>
                    <SearchableSelect value={flCategory} onChange={setFlCategory} options={[{ value: "all", label: "All categories" }, ...uniqueCategories.map(c => ({ value: c, label: c }))]} testid="rb-category" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold block mb-1">Available Stock (min – max)</label>
                    <div className="flex gap-1.5">
                      <input type="number" value={flStockMin} onChange={e => setFlStockMin(e.target.value)} placeholder="min" data-testid="rb-stock-min" className="w-full border border-[var(--border)] px-2 py-1.5 text-[12px] tabular" />
                      <input type="number" value={flStockMax} onChange={e => setFlStockMax(e.target.value)} placeholder="max" data-testid="rb-stock-max" className="w-full border border-[var(--border)] px-2 py-1.5 text-[12px] tabular" />
                    </div>
                  </div>
                </>
              )}

              {reportType === "revenue" && (
                <>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold block mb-1">Date From</label>
                    <input type="date" value={flDateFrom} onChange={e => setFlDateFrom(e.target.value)} data-testid="rb-date-from" className="w-full border border-[var(--border)] px-2 py-1.5 text-[12px]" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold block mb-1">Date To</label>
                    <input type="date" value={flDateTo} onChange={e => setFlDateTo(e.target.value)} data-testid="rb-date-to" className="w-full border border-[var(--border)] px-2 py-1.5 text-[12px]" />
                  </div>
                </>
              )}
            </div>

            {/* Preview Table */}
            <div className="border border-[var(--border)] bg-[var(--surface)] mb-3">
              <button onClick={() => setAdvOpen(o => !o)} data-testid="adv-toggle" className={`w-full flex items-center justify-between px-4 py-2.5 text-[12px] font-medium hover:bg-white transition-colors ${advFilters.length > 0 ? "bg-[#F0F4FF]" : ""}`}>
                <span className="flex items-center gap-1.5"><SlidersHorizontal size={12} className="text-[var(--primary)]" />Advanced Filters {advFilters.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-[var(--primary)] text-white text-[10px] tabular">{advFilters.length}</span>}</span>
                <span className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
                  {advFilters.length > 0 && <span>Match: <b className="uppercase">{advMatch === "all" ? "ALL (AND)" : "ANY (OR)"}</b></span>}
                  <ChevronDown size={12} className={`transition-transform ${advOpen ? "rotate-180" : ""}`} />
                </span>
              </button>
              {advOpen && (
                <div className="p-4 border-t border-[var(--border)] bg-white space-y-3" data-testid="adv-panel">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Match</span>
                    <div className="flex border border-[var(--border)] divide-x divide-[var(--border)]">
                      <button data-testid="adv-match-all" onClick={() => setAdvMatch("all")} className={`px-2.5 py-1 text-[11px] ${advMatch === "all" ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}>ALL (AND)</button>
                      <button data-testid="adv-match-any" onClick={() => setAdvMatch("any")} className={`px-2.5 py-1 text-[11px] ${advMatch === "any" ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}>ANY (OR)</button>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {advFilters.length > 0 && <button onClick={clearAllFilters} data-testid="adv-clear" className="px-2.5 py-1 text-[11px] border border-[var(--border)] hover:bg-[var(--surface)]">Clear all</button>}
                      <button onClick={addFilter} data-testid="adv-add" className="px-2.5 py-1 text-[11px] bg-[var(--primary)] text-white flex items-center gap-1"><Plus size={11} />Add filter</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {advFilters.map((f, i) => {
                      const col = cfg.cols.find(c => c.key === f.field);
                      const type = fieldType(col);
                      const ops = opsFor(type);
                      const needsValue = !["empty", "notempty"].includes(f.operator);
                      const needsRangeEnd = f.operator === "between";
                      const isNumber = type === "number" && !needsRangeEnd && f.operator !== "in_last_days";
                      const isDateInput = type === "date" && !["in_last_days", "empty", "notempty"].includes(f.operator);
                      return (
                        <div key={f.id} className="flex items-center gap-2 flex-wrap border border-[var(--border)] p-2 bg-[var(--surface)]" data-testid={`adv-row-${i}`}>
                          <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold w-8">{i === 0 ? "Where" : advMatch.toUpperCase()}</span>
                          <SearchableSelect value={f.field} onChange={(v) => { const nc = cfg.cols.find(c => c.key === v); updateFilter(f.id, { field: v, operator: opsFor(fieldType(nc))[0].v, value: "", valueEnd: "" }); }} options={cfg.cols.map(c => ({ value: c.key, label: c.label }))} testid={`adv-field-${i}`} className="min-w-[160px]" />
                          <SearchableSelect value={f.operator} onChange={(v) => updateFilter(f.id, { operator: v, value: "", valueEnd: "" })} options={ops.map(o => ({ value: o.v, label: o.l }))} testid={`adv-op-${i}`} className="min-w-[150px]" />
                          {needsValue && (
                            f.operator === "in_last_days" ? (
                              <input type="number" min="1" value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })} placeholder="N days" className="w-24 border border-[var(--border)] px-2 py-1 text-[12px] tabular" data-testid={`adv-val-${i}`} />
                            ) : isDateInput ? (
                              <input type="date" value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })} className="border border-[var(--border)] px-2 py-1 text-[12px] tabular" data-testid={`adv-val-${i}`} />
                            ) : isNumber ? (
                              <input type="number" value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })} placeholder="value" className="w-28 border border-[var(--border)] px-2 py-1 text-[12px] tabular" data-testid={`adv-val-${i}`} />
                            ) : (
                              <input value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })} placeholder="value" className="min-w-[140px] border border-[var(--border)] px-2 py-1 text-[12px]" data-testid={`adv-val-${i}`} />
                            )
                          )}
                          {needsRangeEnd && (
                            <>
                              <span className="text-[11px] text-[var(--fg-muted)]">and</span>
                              {type === "date"
                                ? <input type="date" value={f.valueEnd} onChange={e => updateFilter(f.id, { valueEnd: e.target.value })} className="border border-[var(--border)] px-2 py-1 text-[12px] tabular" data-testid={`adv-valend-${i}`} />
                                : <input type="number" value={f.valueEnd} onChange={e => updateFilter(f.id, { valueEnd: e.target.value })} className="w-28 border border-[var(--border)] px-2 py-1 text-[12px] tabular" data-testid={`adv-valend-${i}`} />
                              }
                            </>
                          )}
                          <button onClick={() => removeFilter(f.id)} data-testid={`adv-rm-${i}`} className="ml-auto p-1.5 hover:bg-white text-[var(--fg-muted)] hover:text-[var(--danger)]"><X size={12} /></button>
                        </div>
                      );
                    })}
                    {advFilters.length === 0 && (
                      <div className="border border-dashed border-[var(--border)] p-4 text-center text-[12px] text-[var(--fg-muted)]">
                        No advanced filters yet — click <b>+ Add filter</b> to build rules like <span className="tabular">available &gt; 100</span>, <span className="tabular">title contains &quot;runner&quot;</span>, or <span className="tabular">last_synced in last 7 days</span>.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Preview Table */}
            <div className="border border-[var(--border)] overflow-x-auto" data-testid="rb-preview">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--surface)]">
                  <tr className="border-b border-[var(--border)]">
                    {useCols.map(c => (
                      <th key={c.key} className={`px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium ${c.num ? "text-right" : "text-left"}`}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 40).map((r, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)]">
                      {useCols.map(c => (
                        <td key={c.key} className={`px-3 py-1.5 ${c.num ? "text-right tabular" : ""}`}>
                          {c.money && typeof r[c.key] === "number" ? fmt(r[c.key]) : String(r[c.key] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={useCols.length} className="px-3 py-6 text-center text-[var(--fg-muted)]">No rows match — adjust filters.</td></tr>
                  )}
                </tbody>
              </table>
              {rows.length > 40 && (
                <div className="px-3 py-2 text-[11px] text-[var(--fg-muted)] bg-[var(--surface)] border-t border-[var(--border)]">Showing 40 of {rows.length} rows · export CSV for full dataset</div>
              )}
            </div>
          </div>
        </div>

        {/* Channel Bars */}
        <div className="border border-[var(--border)] p-6 bg-white">
          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Units Sold by Channel</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byChannel}>
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
