import React from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar } from "recharts";
import { REVENUE_TREND } from "@/data/seed";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Package, Radio, TrendingUp, Clock, CheckCircle2, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

function Kpi({ label, value, delta, deltaLabel, icon: Icon, danger, testid }) {
  const positive = delta >= 0;
  return (
    <div className="border border-[var(--border)] p-5 bg-white hover:shadow-sm transition-shadow" data-testid={testid}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-semibold">{label}</span>
        <Icon size={14} className="text-[var(--fg-muted)]" />
      </div>
      <div className={`text-[28px] font-display font-black tracking-tight leading-none tabular ${danger ? "text-[var(--danger)]" : ""}`}>{value}</div>
      {delta !== undefined && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px]">
          <span className={`inline-flex items-center gap-0.5 font-medium ${positive ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(delta)}%
          </span>
          <span className="text-[var(--fg-muted)]">{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { listings, channels, auditLog, products, revenueSummary } = useStore();
  const totalListings = listings.length;
  const outOfStock = listings.filter(l => l.stock === 0).length;
  const totalRevenue = listings.reduce((s, l) => s + l.revenue_30d, 0);
  const syncErrors = listings.filter(l => l.status === "error").length;
  const draftCount = products.filter(p => p.status === "draft" || p.status === "unlisted").length;
  const { pending, confirmed, refunded, net } = revenueSummary;

  const byChannel = channels.map(c => ({
    name: c.name.split(" ")[0],
    revenue: listings.filter(l => l.channel === c.key).reduce((s, l) => s + l.revenue_30d, 0),
    units: listings.filter(l => l.channel === c.key).reduce((s, l) => s + l.units_sold_30d, 0),
  }));

  return (
    <>
      <Topbar
        title="Command Center"
        breadcrumb="Overview"
        subtitle="Real-time view across Amazon, Shopify, Flipkart & WooCommerce"
        actions={
          <>
            <Link to="/products" data-testid="dash-cta-import" className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] transition-colors">Import Products</Link>
            <Link to="/listings" data-testid="dash-cta-listings" className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors">View Listings</Link>
          </>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-[var(--border)]" data-testid="kpi-grid">
          <div className="border-r border-b lg:border-b-0 border-[var(--border)]"><Kpi testid="kpi-listings" label="Active Listings" value={totalListings.toString()} delta={8.4} deltaLabel="vs last week" icon={Radio} /></div>
          <div className="border-r border-b lg:border-b-0 border-[var(--border)]"><Kpi testid="kpi-oos" label="Out of Stock" value={outOfStock.toString()} delta={-2.1} deltaLabel="vs last week" icon={Package} danger={outOfStock > 0} /></div>
          <div className="border-r border-b sm:border-b-0 border-[var(--border)]"><Kpi testid="kpi-revenue" label="Revenue (30d)" value={fmt(totalRevenue)} delta={12.7} deltaLabel="vs previous 30d" icon={TrendingUp} /></div>
          <div><Kpi testid="kpi-errors" label="Sync Errors" value={syncErrors.toString()} delta={-4.0} deltaLabel="vs last week" icon={AlertTriangle} danger={syncErrors > 0} /></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-[var(--border)]" data-testid="revenue-kpi-grid">
          <div className="p-5 border-r border-b lg:border-b-0 border-[var(--border)] bg-[#FFF7E6]" data-testid="kpi-pending-rev">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-semibold">Pending Revenue</span>
              <Clock size={14} className="text-[var(--warning)]" />
            </div>
            <div className="text-[24px] font-display font-black tracking-tight leading-none tabular text-[var(--warning)]">{fmt(pending)}</div>
            <div className="mt-2 text-[11px] text-[var(--fg-muted)]">Open orders — will be added once delivered</div>
          </div>
          <div className="p-5 border-r border-b lg:border-b-0 border-[var(--border)] bg-[#E6F4EA]" data-testid="kpi-confirmed-rev">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-semibold">Confirmed Revenue</span>
              <CheckCircle2 size={14} className="text-[var(--success)]" />
            </div>
            <div className="text-[24px] font-display font-black tracking-tight leading-none tabular text-[var(--success)]">{fmt(confirmed)}</div>
            <div className="mt-2 text-[11px] text-[var(--fg-muted)]">Delivered orders — before refunds</div>
          </div>
          <div className="p-5 border-r border-b sm:border-b-0 border-[var(--border)] bg-[#FDECEA]" data-testid="kpi-refunded">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-semibold">Refunded</span>
              <Undo2 size={14} className="text-[var(--danger)]" />
            </div>
            <div className="text-[24px] font-display font-black tracking-tight leading-none tabular text-[var(--danger)]">−{fmt(refunded)}</div>
            <div className="mt-2 text-[11px] text-[var(--fg-muted)]">Deducted from confirmed revenue</div>
          </div>
          <div className="p-5" data-testid="kpi-net-rev">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-semibold">Net Revenue</span>
              <TrendingUp size={14} className="text-[var(--fg-muted)]" />
            </div>
            <div className="text-[24px] font-display font-black tracking-tight leading-none tabular">{fmt(net)}</div>
            <div className="mt-2 text-[11px] text-[var(--fg-muted)]">Confirmed − Refunded</div>
          </div>
        </div>

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
            <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-semibold">Channel Mix</div>
            <div className="font-display text-lg font-black tracking-tight mt-1 mb-4">Revenue by channel</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byChannel} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#6B7280" width={70} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 2 }} />
                <Bar dataKey="revenue" fill="#002FA7" />
              </BarChart>
            </ResponsiveContainer>
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
    </>
  );
}
