import React, { useState, useMemo } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { Search, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function RequestHistory() {
  const { requestHistory } = useStore();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => requestHistory.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (q && !r.action.toLowerCase().includes(q.toLowerCase()) && !r.target.toLowerCase().includes(q.toLowerCase()) && !(r.detail || "").toLowerCase().includes(q.toLowerCase()) && !r.actor.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [requestHistory, q, statusFilter]);

  const duration = (r) => {
    const s = new Date(r.started_at.replace(" ", "T"));
    const c = new Date(r.completed_at.replace(" ", "T"));
    const ms = Math.max(0, c - s);
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  const successCount = requestHistory.filter(r => r.status === "success").length;
  const errorCount = requestHistory.filter(r => r.status === "error").length;

  return (
    <>
      <Topbar title="Request History" breadcrumb="Operations · Audit Trail" subtitle="Every action logged with start time, completion time, and outcome." />
      <div className="px-8 py-6 space-y-4">
        <div className="grid grid-cols-3 border border-[var(--border)]">
          <div className="p-4 border-r border-[var(--border)]" data-testid="rh-kpi-total"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Total Requests</div><div className="text-2xl font-display font-black tabular mt-1">{requestHistory.length}</div></div>
          <div className="p-4 border-r border-[var(--border)]" data-testid="rh-kpi-success"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Successful</div><div className="text-2xl font-display font-black tabular mt-1 text-[var(--success)]">{successCount}</div></div>
          <div className="p-4" data-testid="rh-kpi-error"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Failed</div><div className="text-2xl font-display font-black tabular mt-1 text-[var(--danger)]">{errorCount}</div></div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-[var(--border)] px-2.5 py-1.5 flex-1 max-w-md">
            <Search size={13} className="text-[var(--fg-muted)]" />
            <input data-testid="rh-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Action, target, actor…" className="flex-1 text-[13px] outline-none bg-transparent" />
          </div>
          <select data-testid="rh-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-[var(--border)] px-2.5 py-1.5 text-[12px] bg-white">
            <option value="all">All statuses</option><option value="success">Success</option><option value="error">Error</option>
          </select>
          <div className="ml-auto text-[12px] text-[var(--fg-muted)] tabular">{filtered.length} requests</div>
        </div>
        <div className="border border-[var(--border)] bg-white overflow-x-auto">
          <table className="w-full text-[13px]" data-testid="rh-table">
            <thead className="bg-[var(--surface)]">
              <tr className="border-b border-[var(--border)]">
                <th className="p-3 w-8"></th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Action</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Target</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Detail</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Requested By</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Started</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Completed</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)]" data-testid={`rh-row-${r.id}`}>
                  <td className="p-3 text-center">{r.status === "success" ? <CheckCircle2 size={14} className="text-[var(--success)] inline" /> : r.status === "error" ? <XCircle size={14} className="text-[var(--danger)] inline" /> : <Clock size={14} className="text-[var(--warning)] inline" />}</td>
                  <td className="p-3 font-medium">{r.action}</td>
                  <td className="p-3 tabular text-[12px]">{r.target}</td>
                  <td className="p-3 text-[12px] text-[var(--fg-muted)] max-w-md truncate">{r.detail}</td>
                  <td className="p-3 text-[12px]">{r.actor}</td>
                  <td className="p-3 tabular text-[11px] text-[var(--fg-muted)]">{r.started_at}</td>
                  <td className="p-3 tabular text-[11px] text-[var(--fg-muted)]">{r.completed_at}</td>
                  <td className="p-3 text-right tabular text-[11px] font-medium">{duration(r)}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-[13px] text-[var(--fg-muted)]">No requests match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
