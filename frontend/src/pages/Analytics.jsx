import React from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { REVENUE_TREND } from "@/data/seed";
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#FF9900", "#7AB55C", "#2874F0", "#7F54B3"];

export default function Analytics() {
  const { listings, channels } = useStore();
  const byChannel = channels.map((c, i) => ({
    name: c.name.split(" ")[0],
    revenue: listings.filter(l => l.channel === c.key).reduce((s, l) => s + l.revenue_30d, 0),
    units: listings.filter(l => l.channel === c.key).reduce((s, l) => s + l.units_sold_30d, 0),
    color: COLORS[i],
  }));

  const topProducts = [...listings].sort((a, b) => b.revenue_30d - a.revenue_30d).slice(0, 6);

  return (
    <>
      <Topbar title="Analytics" breadcrumb="Overview" subtitle="Deep-dive metrics across every channel and SKU." />
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-[var(--border)] p-6">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Revenue vs Units Sold · 7d</div>
            <ResponsiveContainer width="100%" height={280}>
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
          <div className="border border-[var(--border)] p-6">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Revenue Share</div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byChannel} dataKey="revenue" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {byChannel.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-[var(--border)] p-6">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Units Sold · by channel</div>
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
          <div className="border border-[var(--border)] bg-white">
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
              <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Top Performers</span>
              <span className="text-[11px] text-[var(--fg-muted)]">by 30d revenue</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {topProducts.map((l, i) => (
                <div key={l.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[var(--surface)]">
                  <span className="tabular text-[11px] text-[var(--fg-muted)] w-4">{i + 1}</span>
                  <img src={l.image} alt="" className="w-8 h-8 object-cover border border-[var(--border)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate">{l.title}</div>
                    <div className="text-[11px] text-[var(--fg-muted)] tabular">{l.master_sku} · {l.channel_label}</div>
                  </div>
                  <div className="text-right">
                    <div className="tabular text-[13px] font-medium">₹{l.revenue_30d.toLocaleString("en-IN")}</div>
                    <div className="text-[11px] text-[var(--fg-muted)] tabular">{l.units_sold_30d} units</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
