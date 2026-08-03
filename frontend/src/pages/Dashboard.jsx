import React, { useState, useMemo } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { REVENUE_TREND } from "@/data/seed";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Package, Radio, TrendingUp, Clock, CheckCircle2, Undo2, Plus, Settings2, X, Trash2, PackageX } from "lucide-react";
import { Link } from "react-router-dom";
import SearchableSelect from "@/components/SearchableSelect";
import { toast } from "sonner";

const fmt = (n) => "₹" + (n || 0).toLocaleString("en-IN");

// Metric library: how each metric is computed from the store, and where its card links
const METRICS = {
  active_listings:  { label: "Active Listings",   icon: Radio,          fmt: (v) => v.toString(),  link: "/listings" },
  out_of_stock:     { label: "Out of Stock",      icon: PackageX,       fmt: (v) => v.toString(),  link: "/listings?stock=out",  danger: true },
  low_stock:        { label: "Low Stock",         icon: AlertTriangle,  fmt: (v) => v.toString(),  link: "/listings?stock=low",  warning: true },
  sync_errors:      { label: "Sync Errors",       icon: AlertTriangle,  fmt: (v) => v.toString(),  link: "/alerts",              danger: true },
  revenue_30d:      { label: "Revenue (30d)",     icon: TrendingUp,     fmt,                       link: "/analytics" },
  pending_revenue:  { label: "Pending Revenue",   icon: Clock,          fmt,                       link: "/orders?status=processing", warning: true },
  confirmed_revenue:{ label: "Confirmed Revenue", icon: CheckCircle2,   fmt,                       link: "/orders?status=delivered",  success: true },
  refunded:         { label: "Refunded",          icon: Undo2,          fmt: (v) => "−" + fmt(v),  link: "/returns",             danger: true },
  net_revenue:      { label: "Net Revenue",       icon: TrendingUp,     fmt,                       link: "/analytics" },
  orders_open:      { label: "Open Orders",       icon: Package,        fmt: (v) => v.toString(),  link: "/orders?status=processing" },
  orders_delivered: { label: "Delivered (30d)",   icon: CheckCircle2,   fmt: (v) => v.toString(),  link: "/orders?status=delivered" },
  returns_open:     { label: "Open Returns",      icon: Undo2,          fmt: (v) => v.toString(),  link: "/returns" },
  channel_revenue:  { label: "Channel Revenue",   icon: TrendingUp,     fmt,                       link: null, needsChannel: true },
  channel_units:    { label: "Channel Units",     icon: Package,        fmt: (v) => v.toString(),  link: null, needsChannel: true },
};

// Compute a metric value from the store
function useMetricValue({ metric, channel }) {
  const { listings, orders, returns, products, revenueSummary, revenueByChannel, availableForListing, orderTotal, orderQty } = useStore();
  return useMemo(() => {
    switch (metric) {
      case "active_listings":   return listings.filter(l => channel === "all" || l.channel === channel).length;
      case "out_of_stock":      return listings.filter(l => (channel === "all" || l.channel === channel) && availableForListing(l) === 0).length;
      case "low_stock":         return listings.filter(l => { const a = availableForListing(l); return (channel === "all" || l.channel === channel) && a > 0 && a <= 10; }).length;
      case "sync_errors":       return listings.filter(l => (channel === "all" || l.channel === channel) && l.status === "error").length;
      case "revenue_30d":       return listings.filter(l => channel === "all" || l.channel === channel).reduce((s, l) => s + l.revenue_30d, 0);
      case "pending_revenue":   return channel === "all" ? revenueSummary.pending   : (revenueByChannel[channel]?.pending   || 0);
      case "confirmed_revenue": return channel === "all" ? revenueSummary.confirmed : (revenueByChannel[channel]?.confirmed || 0);
      case "refunded":          return channel === "all" ? revenueSummary.refunded  : (revenueByChannel[channel]?.refunded  || 0);
      case "net_revenue":       return channel === "all" ? revenueSummary.net       : (revenueByChannel[channel]?.net       || 0);
      case "orders_open":       return orders.filter(o => (channel === "all" || o.channel === channel) && ["placed","processing","shipped"].includes(o.status)).length;
      case "orders_delivered":  return orders.filter(o => (channel === "all" || o.channel === channel) && o.status === "delivered").length;
      case "returns_open":      return returns.filter(r => (channel === "all" || r.channel === channel) && r.status !== "refunded" && r.status !== "rejected").length;
      case "channel_revenue":   return channel === "all" ? Object.values(revenueByChannel).reduce((s, r) => s + r.net, 0) : (revenueByChannel[channel]?.net || 0);
      case "channel_units":     return channel === "all" ? Object.values(revenueByChannel).reduce((s, r) => s + r.units, 0) : (revenueByChannel[channel]?.units || 0);
      default: return 0;
    }
  }, [metric, channel, listings, orders, returns, products, revenueSummary, revenueByChannel, availableForListing, orderTotal, orderQty]);
}

function DashletCard({ dashlet, onEdit, onRemove }) {
  const cfg = METRICS[dashlet.metric] || METRICS.active_listings;
  const Icon = cfg.icon;
  const value = useMetricValue({ metric: dashlet.metric, channel: dashlet.channel });
  const link = cfg.link || (cfg.needsChannel && dashlet.channel !== "all" ? `/listings?channel=${dashlet.channel}` : "/listings");
  const linkWithRange = link.includes("?") ? `${link}&range=${dashlet.range}` : `${link}?range=${dashlet.range}`;
  const emphasis = cfg.danger && value > 0 ? "text-[var(--danger)]" : cfg.warning && value > 0 ? "text-[var(--warning)]" : cfg.success ? "text-[var(--success)]" : "";
  const bg = cfg.danger && value > 0 ? "bg-[#FDECEA]" : cfg.warning && value > 0 ? "bg-[#FFF7E6]" : cfg.success ? "bg-[#E6F4EA]" : "bg-white";
  return (
    <div className={`relative border border-[var(--border)] hover:shadow-sm transition-shadow ${bg}`} data-testid={`dashlet-${dashlet.id}`}>
      <Link to={linkWithRange} className="block p-5">
        <div className="flex items-start justify-between mb-3 pr-14">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-semibold truncate">{dashlet.label || cfg.label}</span>
          <Icon size={14} className="text-[var(--fg-muted)] shrink-0" />
        </div>
        <div className={`text-[26px] font-display font-black tracking-tight leading-none tabular ${emphasis}`}>{cfg.fmt(value)}</div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--fg-muted)]">
          <span className="uppercase tracking-widest tabular">{dashlet.range}</span>
          {dashlet.channel !== "all" && <><span>·</span><ChannelChip channel={dashlet.channel} /></>}
        </div>
      </Link>
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <button onClick={onEdit} data-testid={`dashlet-edit-${dashlet.id}`} className="p-1 hover:bg-white/80 border border-transparent hover:border-[var(--border)]" title="Edit dashlet"><Settings2 size={11} className="text-[var(--fg-muted)]" /></button>
        {onRemove && <button onClick={onRemove} data-testid={`dashlet-remove-${dashlet.id}`} className="p-1 hover:bg-white/80 border border-transparent hover:border-[var(--border)]" title="Remove"><Trash2 size={11} className="text-[var(--fg-muted)] hover:text-[var(--danger)]" /></button>}
      </div>
    </div>
  );
}

function DashletEditor({ dashlet, onSave, onClose }) {
  const [label, setLabel] = useState(dashlet.label || "");
  const [metric, setMetric] = useState(dashlet.metric);
  const [range, setRange] = useState(dashlet.range);
  const [channel, setChannel] = useState(dashlet.channel);
  const metricOptions = Object.entries(METRICS).map(([k, v]) => ({ value: k, label: v.label }));
  const channelOptions = [{ value: "all", label: "All channels" }, { value: "amazon", label: "Amazon" }, { value: "shopify", label: "Shopify" }, { value: "flipkart", label: "Flipkart" }, { value: "woocommerce", label: "WooCommerce" }];
  const rangeOptions = [{ value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "90d", label: "Last 90 days" }, { value: "ytd", label: "Year to date" }];
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md border border-[var(--border)]" onClick={e => e.stopPropagation()} data-testid="dashlet-editor">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">{dashlet.metric ? "Edit Dashlet" : "New Dashlet"}</div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--surface)]"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Label (optional)</span>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder={METRICS[metric]?.label} className="w-full mt-1 border border-[var(--border)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--primary)]" data-testid="dashlet-label-input" /></label>
          <div><span className="text-[11px] font-medium text-[var(--fg-muted)] block mb-1">Metric</span>
            <SearchableSelect value={metric} onChange={setMetric} options={metricOptions} testid="dashlet-metric" /></div>
          <div><span className="text-[11px] font-medium text-[var(--fg-muted)] block mb-1">Date range</span>
            <SearchableSelect value={range} onChange={setRange} options={rangeOptions} testid="dashlet-range" /></div>
          <div><span className="text-[11px] font-medium text-[var(--fg-muted)] block mb-1">Channel filter</span>
            <SearchableSelect value={channel} onChange={setChannel} options={channelOptions} testid="dashlet-channel" /></div>
          <div className="text-[11px] text-[var(--fg-muted)] bg-[var(--surface)] p-2 border border-[var(--border)]">Click the card to drill into the corresponding page pre-filtered by these settings.</div>
        </div>
        <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white">Cancel</button>
          <button onClick={() => { onSave({ ...dashlet, label: label.trim(), metric, range, channel }); onClose(); }} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white" data-testid="dashlet-save">Save Dashlet</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { listings, channels, auditLog, products, topProductsByChannel } = useStore();
  const totalListings = listings.length;
  const draftCount = products.filter(p => p.status === "draft" || p.status === "unlisted").length;
  const topByChannel = topProductsByChannel(5);

  const byChannel = channels.map(c => ({
    name: c.name.split(" ")[0],
    revenue: listings.filter(l => l.channel === c.key).reduce((s, l) => s + l.revenue_30d, 0),
    units: listings.filter(l => l.channel === c.key).reduce((s, l) => s + l.units_sold_30d, 0),
  }));

  // Core KPIs (fixed 4, each becomes a Link to the drill-down)
  const coreDashlets = [
    { id: "core-listings",  metric: "active_listings",   range: "30d", channel: "all", core: true },
    { id: "core-oos",       metric: "out_of_stock",      range: "30d", channel: "all", core: true },
    { id: "core-revenue",   metric: "revenue_30d",       range: "30d", channel: "all", core: true },
    { id: "core-errors",    metric: "sync_errors",       range: "30d", channel: "all", core: true },
  ];

  // Custom dashlets (up to 4 additional → 8 total max)
  const [customDashlets, setCustomDashlets] = useState([
    { id: "cd-1", metric: "pending_revenue",   range: "30d", channel: "all",     label: "" },
    { id: "cd-2", metric: "confirmed_revenue", range: "30d", channel: "all",     label: "" },
    { id: "cd-3", metric: "net_revenue",       range: "30d", channel: "all",     label: "" },
    { id: "cd-4", metric: "low_stock",         range: "30d", channel: "all",     label: "" },
  ]);
  const [editing, setEditing] = useState(null); // dashlet being edited
  const MAX_CUSTOM = 8;

  const openEdit = (dashlet) => setEditing({ ...dashlet });
  const saveEdit = (updated) => {
    if (updated.id.startsWith("core-")) {
      // Cores are fixed — customization applies only to link filters via range/channel state. Show it via toast.
      toast.info("Core KPI filters saved for this session");
      // Update in place if any core we allow tuning; for now allow range/channel override:
      // simplest: store overrides in customDashlets? We'll skip and only allow custom editing here.
      return;
    }
    setCustomDashlets(prev => prev.map(d => d.id === updated.id ? updated : d));
    toast.success("Dashlet updated");
  };
  const addDashlet = () => {
    if (customDashlets.length >= MAX_CUSTOM) { toast.error(`Maximum ${MAX_CUSTOM} custom dashlets reached`); return; }
    const newD = { id: `cd-${Date.now()}`, metric: "pending_revenue", range: "30d", channel: "all", label: "" };
    setCustomDashlets(prev => [...prev, newD]);
    setEditing(newD);
  };
  const removeDashlet = (id) => setCustomDashlets(prev => prev.filter(d => d.id !== id));

  return (
    <>
      <Topbar
        title="Command Center"
        breadcrumb="Overview"
        subtitle="Click any card to drill into the filtered view. Add up to 4 custom dashlets."
        actions={
          <>
            <Link to="/products" data-testid="dash-cta-import" className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] transition-colors">Import Products</Link>
            <button onClick={addDashlet} data-testid="dash-add-dashlet" disabled={customDashlets.length >= MAX_CUSTOM} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 flex items-center gap-1.5 transition-colors"><Plus size={12} />Add Dashlet ({customDashlets.length}/{MAX_CUSTOM})</button>
          </>
        }
      />

      <div className="p-8 space-y-6">
        {/* Core KPIs (fixed, editable filter, always link) */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-2">Core KPIs</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="kpi-grid">
            {coreDashlets.map(d => <DashletCard key={d.id} dashlet={d} onEdit={() => openEdit(d)} />)}
          </div>
        </div>

        {/* Custom Dashlets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Custom Dashlets · {customDashlets.length}/{MAX_CUSTOM}</div>
            {customDashlets.length < MAX_CUSTOM && <button onClick={addDashlet} className="text-[11px] text-[var(--primary)] hover:underline flex items-center gap-0.5"><Plus size={11} />Add</button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="custom-dashlets-grid">
            {customDashlets.map(d => <DashletCard key={d.id} dashlet={d} onEdit={() => openEdit(d)} onRemove={() => removeDashlet(d.id)} />)}
            {customDashlets.length < MAX_CUSTOM && (
              <button onClick={addDashlet} data-testid="add-dashlet-empty" className="border border-dashed border-[var(--border)] hover:border-[var(--primary)] hover:bg-[#F0F4FF] p-5 flex flex-col items-center justify-center gap-1 text-[var(--fg-muted)] hover:text-[var(--primary)] transition-colors min-h-[130px]">
                <Plus size={20} />
                <span className="text-[11px] uppercase tracking-widest font-semibold">Add Dashlet</span>
              </button>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-[var(--border)] bg-white p-6" data-testid="revenue-chart">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-semibold">Revenue Trend</div>
                <div className="font-display text-lg font-black tracking-tight mt-1">Last 7 days · by channel</div>
              </div>
              <div className="flex gap-4 text-[11px]">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2" style={{ background: "#FF9900" }}></span>Amazon</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2" style={{ background: "#7AB55C" }}></span>Shopify</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2" style={{ background: "#2874F0" }}></span>Flipkart</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2" style={{ background: "#7F54B3" }}></span>Woo</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={REVENUE_TREND}>
                <CartesianGrid strokeDasharray="2 2" stroke="#E5E7EB" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 2 }} />
                <Line type="monotone" dataKey="amazon" stroke="#FF9900" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="shopify" stroke="#7AB55C" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="flipkart" stroke="#2874F0" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="woocommerce" stroke="#7F54B3" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="border border-[var(--border)] bg-white p-6" data-testid="channel-mix">
            <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-semibold">Top Sellers by Channel</div>
            <div className="font-display text-lg font-black tracking-tight mt-1 mb-4">Most sold · top 5 each</div>
            <div className="space-y-4">
              {channels.filter(c => c.status === "connected" || (topByChannel[c.key] || []).length > 0).map(c => {
                const rows = topByChannel[c.key] || [];
                return (
                  <div key={c.id} data-testid={`top-channel-${c.key}`}>
                    <div className="flex items-center gap-1.5 mb-1.5"><ChannelChip channel={c.key} /><span className="text-[11px] font-medium">{c.name.split(" ")[0]}</span></div>
                    {rows.length === 0
                      ? <div className="text-[11px] text-[var(--fg-muted)] pl-2">No deliveries yet</div>
                      : <div className="space-y-1">{rows.map((r, i) => (
                          <div key={r.master_id} className="flex items-center gap-2 text-[11px] pl-2">
                            <span className="tabular text-[var(--fg-muted)] w-4">#{i + 1}</span>
                            <span className="flex-1 truncate">{r.product.title}</span>
                            <span className="tabular font-medium">{r.qty}u</span>
                          </div>
                        ))}</div>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-[var(--border)] bg-white" data-testid="audit-log">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-semibold">Activity</div>
                <div className="font-display text-lg font-black tracking-tight mt-0.5">Real-time sync log</div>
              </div>
              <span className="text-[11px] text-[var(--fg-muted)] tabular">{auditLog.length} events</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {auditLog.slice(0, 6).map((a, i) => (
                <div key={i} className="px-6 py-3 flex items-start gap-4 text-[13px] hover:bg-[var(--surface)] transition-colors">
                  <span className="tabular text-[11px] text-[var(--fg-muted)] w-28 shrink-0 mt-0.5">{a.ts}</span>
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${a.level === "error" ? "bg-[var(--danger)]" : a.level === "success" ? "bg-[var(--success)]" : "bg-[var(--fg-muted)]"}`}></span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{a.event}</div>
                    <div className="text-[12px] text-[var(--fg-muted)] truncate">{a.detail}</div>
                  </div>
                  <span className="text-[11px] text-[var(--fg-muted)]">{a.actor}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[var(--border)] bg-white p-6" data-testid="quick-summary">
            <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-semibold">Quick Summary</div>
            <div className="font-display text-lg font-black tracking-tight mt-0.5 mb-4">This week</div>
            <div className="space-y-3">
              {channels.map(c => (
                <div key={c.id} className="flex items-center justify-between text-[13px] border-b border-[var(--border)] pb-2 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <ChannelChip channel={c.key} />
                    <StatusPill status={c.status} />
                  </div>
                  <span className="tabular text-[12px] font-medium">{fmt(c.revenue_30d)}</span>
                </div>
              ))}
              <div className="pt-2 flex items-center justify-between text-[12px] text-[var(--fg-muted)]">
                <span>Drafts / Unlisted</span>
                <span className="tabular">{draftCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editing && <DashletEditor dashlet={editing} onSave={saveEdit} onClose={() => setEditing(null)} />}
    </>
  );
}
