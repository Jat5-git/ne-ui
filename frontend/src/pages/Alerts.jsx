import React, { useState, useMemo, useEffect } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { AlertTriangle, AlertCircle, PackageX, Radio, ChevronRight, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const ICON = { out_of_stock: PackageX, low_stock: AlertTriangle, sync_error: Radio, request_error: AlertCircle };
const SEV_COLOR = { critical: "var(--danger)", warning: "var(--warning)", info: "var(--fg-muted)" };
const SEV_BG = { critical: "#FDECEA", warning: "#FFF7E6", info: "#F3F4F6" };

export default function Alerts() {
  const { alerts } = useStore();
  const location = useLocation();
  const focusId = location.hash.replace("#", "");
  const [q, setQ] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (focusId) {
      setTimeout(() => document.getElementById(focusId)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [focusId]);

  const filtered = useMemo(() => alerts.filter(a => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (q && !a.entity_label.toLowerCase().includes(q.toLowerCase()) && !a.message.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [alerts, q, severityFilter, typeFilter]);

  const critical = alerts.filter(a => a.severity === "critical").length;
  const warning = alerts.filter(a => a.severity === "warning").length;

  return (
    <>
      <Topbar title="Alerts & Action Required" breadcrumb="Setup · System Health" subtitle="Everything the platform detected that needs your attention." />
      <div className="px-8 py-6 space-y-4">
        <div className="grid grid-cols-3 border border-[var(--border)]">
          <div className="p-4 border-r border-[var(--border)] bg-[#FDECEA]" data-testid="al-kpi-critical"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold flex items-center gap-1"><AlertCircle size={11} className="text-[var(--danger)]" />Critical</div><div className="text-2xl font-display font-black tabular mt-1 text-[var(--danger)]">{critical}</div></div>
          <div className="p-4 border-r border-[var(--border)] bg-[#FFF7E6]" data-testid="al-kpi-warning"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold flex items-center gap-1"><AlertTriangle size={11} className="text-[var(--warning)]" />Warnings</div><div className="text-2xl font-display font-black tabular mt-1 text-[var(--warning)]">{warning}</div></div>
          <div className="p-4" data-testid="al-kpi-total"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Total</div><div className="text-2xl font-display font-black tabular mt-1">{alerts.length}</div></div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-[var(--border)] px-2.5 py-1.5 flex-1 max-w-md">
            <Search size={13} className="text-[var(--fg-muted)]" />
            <input data-testid="al-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Entity, message…" className="flex-1 text-[13px] outline-none bg-transparent" />
          </div>
          <select data-testid="al-severity" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="border border-[var(--border)] px-2.5 py-1.5 text-[12px] bg-white">
            <option value="all">All severities</option><option value="critical">Critical</option><option value="warning">Warning</option>
          </select>
          <select data-testid="al-type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-[var(--border)] px-2.5 py-1.5 text-[12px] bg-white">
            <option value="all">All types</option><option value="out_of_stock">Out of stock</option><option value="low_stock">Low stock</option><option value="sync_error">Sync error</option><option value="request_error">Request error</option>
          </select>
          <div className="ml-auto text-[12px] text-[var(--fg-muted)] tabular">{filtered.length} alerts</div>
        </div>
        <div className="space-y-2" data-testid="al-list">
          {filtered.map(a => {
            const Icon = ICON[a.type] || AlertCircle;
            const focused = a.id === focusId;
            return (
              <div key={a.id} id={a.id} className={`border ${focused ? "border-[var(--primary)] shadow-md" : "border-[var(--border)]"} bg-white p-4 flex items-start gap-3`} data-testid={`al-item-${a.id}`}>
                <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: SEV_BG[a.severity] }}><Icon size={16} color={SEV_COLOR[a.severity]} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[13px]">{a.title}</span>
                    <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 font-semibold" style={{ background: SEV_BG[a.severity], color: SEV_COLOR[a.severity] }}>{a.severity}</span>
                  </div>
                  <div className="text-[12px] text-[var(--fg-muted)] mt-0.5 tabular">{a.entity_label}</div>
                  <div className="text-[13px] mt-1">{a.message}</div>
                  <div className="text-[11px] text-[var(--fg-muted)] tabular mt-1">Detected: {a.detected_at}</div>
                </div>
                <Link to={a.action} className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5 self-start" data-testid={`al-goto-${a.id}`}>{a.action_label}<ChevronRight size={11} /></Link>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="border border-dashed border-[var(--border)] p-12 text-center text-[13px] text-[var(--fg-muted)]">{alerts.length === 0 ? "All clear — nothing needs your attention right now." : "No alerts match your filters."}</div>
          )}
        </div>
      </div>
    </>
  );
}
