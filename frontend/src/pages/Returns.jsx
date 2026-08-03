import React, { useState, useMemo } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";
import { Search, ChevronRight, Package, DollarSign, XCircle } from "lucide-react";
import { toast } from "sonner";

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

const NEXT = {
  requested:  { next: "in_transit", label: "Confirm Pickup",  icon: Package },
  in_transit: { next: "received",   label: "Mark Received",   icon: Package },
  received:   { next: "refunded",   label: "Issue Refund",    icon: DollarSign },
};

export default function Returns() {
  const { returns, updateReturnStatus, returnRefund, returnQty } = useStore();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState(new Set());

  const filtered = useMemo(() => returns.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (q && !r.id.toLowerCase().includes(q.toLowerCase()) && !r.order_id.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [returns, q, statusFilter]);

  const toggle = (id) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const advance = (r) => {
    const step = NEXT[r.status]; if (!step) return;
    updateReturnStatus(r.id, step.next);
    const map = { in_transit: "confirmed in transit", received: "received & restocked", refunded: "refunded — revenue reversed" };
    toast.success(`${r.id} ${map[step.next]}`);
  };
  const reject = (r) => {
    updateReturnStatus(r.id, "rejected");
    toast(`${r.id} rejected`);
  };

  const totalRefunded = returns.filter(r => r.status === "refunded").reduce((s, r) => s + returnRefund(r), 0);
  const inProgress = returns.filter(r => ["requested", "in_transit", "received"].includes(r.status)).length;

  return (
    <>
      <Topbar title="Returns" breadcrumb="Operations" subtitle="Restocks inventory & reverses revenue automatically." />
      <div className="px-8 py-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 border border-[var(--border)]">
          <div className="p-4 border-r border-[var(--border)]" data-testid="ret-kpi-total">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Total Returns</div>
            <div className="text-2xl font-display font-black tabular mt-1">{returns.length}</div>
          </div>
          <div className="p-4 border-r border-[var(--border)]" data-testid="ret-kpi-progress">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">In Progress</div>
            <div className="text-2xl font-display font-black tabular mt-1 text-[var(--warning)]">{inProgress}</div>
          </div>
          <div className="p-4" data-testid="ret-kpi-refunded">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Refunded (deducted)</div>
            <div className="text-2xl font-display font-black tabular mt-1 text-[var(--danger)]">−{fmt(totalRefunded)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-[var(--border)] px-2.5 py-1.5 flex-1 max-w-md">
            <Search size={13} className="text-[var(--fg-muted)]" />
            <input data-testid="ret-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Return ID or order ID…" className="flex-1 text-[13px] outline-none bg-transparent" />
          </div>
          <select data-testid="ret-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-[var(--border)] px-2.5 py-1.5 text-[12px] bg-white">
            <option value="all">All statuses</option>
            <option value="requested">Requested</option>
            <option value="in_transit">In transit</option>
            <option value="received">Received</option>
            <option value="refunded">Refunded</option>
            <option value="rejected">Rejected</option>
          </select>
          <div className="ml-auto text-[12px] text-[var(--fg-muted)] tabular">{filtered.length} returns</div>
        </div>

        <div className="border border-[var(--border)] bg-white overflow-x-auto">
          <table className="w-full text-[13px]" data-testid="returns-table">
            <thead className="bg-[var(--surface)]">
              <tr className="border-b border-[var(--border)]">
                <th className="p-3 w-8"></th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Return ID</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Order</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channel</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Reason</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Qty</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Refund</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Status</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Date</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium w-64">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const step = NEXT[r.status];
                const isOpen = expanded.has(r.id);
                const canReject = ["requested", "in_transit"].includes(r.status);
                return (
                  <React.Fragment key={r.id}>
                    <tr className="border-b border-[var(--border)] last:border-b-0 row-hover cursor-pointer hover:bg-[var(--surface)]" data-testid={`return-${r.id}`} onClick={() => toggle(r.id)}>
                      <td className="p-3 text-center"><ChevronRight size={14} className={`text-[var(--fg-muted)] transition-transform ${isOpen ? "rotate-90" : ""}`} /></td>
                      <td className="p-3 tabular">{r.id}</td>
                      <td className="p-3 tabular text-[12px]">{r.order_id}</td>
                      <td className="p-3"><ChannelChip channel={r.channel} /></td>
                      <td className="p-3">{r.reason}</td>
                      <td className="p-3 text-right tabular">{returnQty(r)}</td>
                      <td className="p-3 text-right tabular font-medium text-[var(--danger)]">−{fmt(returnRefund(r))}</td>
                      <td className="p-3"><StatusPill status={r.status} /></td>
                      <td className="p-3 tabular text-[11px] text-[var(--fg-muted)]">{r.date}</td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          {step && (
                            <button data-testid={`ret-advance-${r.id}`} onClick={() => advance(r)} className="px-2 py-1 text-[11px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1 transition-colors">
                              <step.icon size={11} />{step.label}
                            </button>
                          )}
                          {canReject && (
                            <button data-testid={`ret-reject-${r.id}`} onClick={() => reject(r)} className="px-2 py-1 text-[11px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1">
                              <XCircle size={11} />Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-[#FAFAFA]">
                        <td colSpan={10} className="px-12 py-4 border-b border-[var(--border)]">
                          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-2">Line items · Restocked / Refunded</div>
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="border-b border-[var(--border)]">
                                <th className="py-1.5 text-left text-[10px] uppercase text-[var(--fg-muted)]">Master SKU</th>
                                <th className="py-1.5 text-right text-[10px] uppercase text-[var(--fg-muted)]">Qty</th>
                                <th className="py-1.5 text-right text-[10px] uppercase text-[var(--fg-muted)]">Refund</th>
                                <th className="py-1.5 text-left text-[10px] uppercase text-[var(--fg-muted)]">Stock impact</th>
                                <th className="py-1.5 text-left text-[10px] uppercase text-[var(--fg-muted)]">Revenue impact</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(r.line_items || []).map((li, i) => (
                                <tr key={i} className="border-b border-[var(--border)] last:border-b-0">
                                  <td className="py-1.5 tabular">{li.master_sku}</td>
                                  <td className="py-1.5 text-right tabular">{li.qty}</td>
                                  <td className="py-1.5 text-right tabular text-[var(--danger)]">−{fmt(li.refund_amount)}</td>
                                  <td className="py-1.5 text-[11px]">
                                    {["received", "refunded"].includes(r.status) ? <span className="text-[var(--success)]">+{li.qty} restocked</span> : <span className="text-[var(--fg-muted)]">Pending restock</span>}
                                  </td>
                                  <td className="py-1.5 text-[11px]">
                                    {r.status === "refunded" ? <span className="text-[var(--danger)]">−{fmt(li.refund_amount)} deducted</span> : <span className="text-[var(--fg-muted)]">No deduction yet</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={10} className="p-12 text-center text-[13px] text-[var(--fg-muted)]">No returns match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
