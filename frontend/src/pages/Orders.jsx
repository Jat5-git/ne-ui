import React, { useState, useMemo } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";
import { Search, ChevronRight, PackageCheck, XCircle, Undo2, Truck, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

// Which button to render next based on current status
const NEXT_ACTION = {
  placed:     { next: "processing", label: "Move to Processing", icon: ArrowRight },
  processing: { next: "shipped",    label: "Mark Shipped",       icon: Truck },
  shipped:    { next: "delivered",  label: "Mark Delivered",     icon: PackageCheck },
};

export default function Orders() {
  const { orders, updateOrderStatus, createReturn, orderTotal, orderQty } = useStore();
  const [q, setQ] = useState("");
  const [ch, setCh] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState(new Set());
  const [returnFor, setReturnFor] = useState(null); // order object

  const filtered = useMemo(() => orders.filter(o => {
    if (ch !== "all" && o.channel !== ch) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (q && !o.channel_order_id.toLowerCase().includes(q.toLowerCase()) && !o.customer.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [orders, q, ch, statusFilter]);

  const toggle = (id) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const advance = (o) => {
    const step = NEXT_ACTION[o.status]; if (!step) return;
    updateOrderStatus(o.id, step.next);
    const map = { processing: "moved to Processing", shipped: "marked as Shipped", delivered: "delivered — revenue confirmed" };
    toast.success(`${o.channel_order_id} ${map[step.next]}`);
  };
  const cancel = (o) => {
    updateOrderStatus(o.id, "cancelled");
    toast(`${o.channel_order_id} cancelled`, { description: `${orderQty(o)} units released back to stock.` });
  };

  return (
    <>
      <Topbar title="Orders" breadcrumb="Operations · Unified" subtitle="Every order moves stock and revenue as its status advances." />
      <div className="px-8 py-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-[var(--border)] px-2.5 py-1.5 flex-1 max-w-md">
            <Search size={13} className="text-[var(--fg-muted)]" />
            <input data-testid="orders-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Order ID or customer…" className="flex-1 text-[13px] outline-none bg-transparent" />
          </div>
          <div className="flex items-center border border-[var(--border)] divide-x divide-[var(--border)]">
            {["all", "amazon", "shopify", "flipkart", "woocommerce"].map(c => (
              <button key={c} data-testid={`ord-ch-${c}`} onClick={() => setCh(c)} className={`px-3 py-1.5 text-[12px] capitalize transition-colors ${ch === c ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}>{c}</button>
            ))}
          </div>
          <select data-testid="ord-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-[var(--border)] px-2.5 py-1.5 text-[12px] bg-white">
            <option value="all">All statuses</option>
            <option value="placed">Placed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </select>
          <div className="ml-auto text-[12px] text-[var(--fg-muted)] tabular">{filtered.length} orders</div>
        </div>

        <div className="border border-[var(--border)] bg-white overflow-x-auto">
          <table className="w-full text-[13px]" data-testid="orders-table">
            <thead className="bg-[var(--surface)]">
              <tr className="border-b border-[var(--border)]">
                <th className="p-3 w-8"></th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Order</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channel</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Customer</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Units</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Total</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Status</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Date</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium w-80">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const isOpen = expanded.has(o.id);
                const step = NEXT_ACTION[o.status];
                const canCancel = ["placed", "processing", "shipped"].includes(o.status);
                const canReturn = o.status === "delivered";
                return (
                  <React.Fragment key={o.id}>
                    <tr className="border-b border-[var(--border)] last:border-b-0 row-hover cursor-pointer hover:bg-[var(--surface)]" data-testid={`order-${o.id}`} onClick={() => toggle(o.id)}>
                      <td className="p-3 text-center"><ChevronRight size={14} className={`text-[var(--fg-muted)] transition-transform ${isOpen ? "rotate-90" : ""}`} /></td>
                      <td className="p-3 tabular text-[12px]">{o.channel_order_id}</td>
                      <td className="p-3"><ChannelChip channel={o.channel} /></td>
                      <td className="p-3">{o.customer}</td>
                      <td className="p-3 text-right tabular">{orderQty(o)}</td>
                      <td className="p-3 text-right tabular font-medium">{fmt(orderTotal(o))}</td>
                      <td className="p-3"><StatusPill status={o.status} /></td>
                      <td className="p-3 tabular text-[11px] text-[var(--fg-muted)]">{o.date}</td>
                      <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          {step && (
                            <button data-testid={`advance-${o.id}`} onClick={() => advance(o)} className="px-2 py-1 text-[11px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1 transition-colors">
                              <step.icon size={11} />{step.label}
                            </button>
                          )}
                          {canCancel && (
                            <button data-testid={`cancel-${o.id}`} onClick={() => cancel(o)} className="px-2 py-1 text-[11px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1 transition-colors">
                              <XCircle size={11} />Cancel
                            </button>
                          )}
                          {canReturn && (
                            <button data-testid={`return-${o.id}`} onClick={() => setReturnFor(o)} className="px-2 py-1 text-[11px] border border-[var(--warning)] text-[var(--warning)] bg-[#FFF7E6] hover:bg-[#FFEBBA] flex items-center gap-1 transition-colors">
                              <Undo2 size={11} />Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-[#FAFAFA]">
                        <td colSpan={9} className="px-12 py-4 border-b border-[var(--border)]">
                          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-2">Line items · Stock impact</div>
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="border-b border-[var(--border)]">
                                <th className="py-1.5 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Master SKU</th>
                                <th className="py-1.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Qty</th>
                                <th className="py-1.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Unit Price</th>
                                <th className="py-1.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Line Total</th>
                                <th className="py-1.5 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Effect</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(o.line_items || []).map((li, i) => (
                                <tr key={i} className="border-b border-[var(--border)] last:border-b-0">
                                  <td className="py-1.5 tabular">{li.master_sku}</td>
                                  <td className="py-1.5 text-right tabular">{li.qty}</td>
                                  <td className="py-1.5 text-right tabular">{fmt(li.unit_price)}</td>
                                  <td className="py-1.5 text-right tabular font-medium">{fmt(li.qty * li.unit_price)}</td>
                                  <td className="py-1.5 text-[11px]">
                                    {["placed", "processing", "shipped"].includes(o.status) && <span className="text-[var(--warning)]">Blocked · Pending revenue</span>}
                                    {o.status === "delivered" && <span className="text-[var(--success)]">Stock consumed · Revenue confirmed</span>}
                                    {o.status === "cancelled" && <span className="text-[var(--fg-muted)]">Released — no stock/revenue impact</span>}
                                    {o.status === "returned" && <span className="text-[var(--danger)]">Restocked · Revenue reversed</span>}
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
              {filtered.length === 0 && <tr><td colSpan={9} className="p-12 text-center text-[13px] text-[var(--fg-muted)]">No orders match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {returnFor && <ReturnModal order={returnFor} onClose={() => setReturnFor(null)} onSubmit={(items, reason) => { createReturn(returnFor.id, items, reason); toast.success(`Return created for ${returnFor.channel_order_id}`); setReturnFor(null); }} />}
    </>
  );
}

function ReturnModal({ order, onClose, onSubmit }) {
  const [items, setItems] = useState((order.line_items || []).map(li => ({ ...li, qty: li.qty, refund_amount: li.qty * li.unit_price, selected: false })));
  const [reason, setReason] = useState("Wrong item");

  const toggle = (i) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, selected: !it.selected } : it));
  const setQty = (i, q) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, qty: Math.max(1, Math.min(order.line_items[i].qty, Number(q) || 1)), refund_amount: Math.max(1, Math.min(order.line_items[i].qty, Number(q) || 1)) * it.unit_price } : it));

  const selected = items.filter(it => it.selected);
  const total = selected.reduce((s, it) => s + it.refund_amount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-[var(--border)] w-full max-w-lg" onClick={e => e.stopPropagation()} data-testid="return-modal">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Create Return</div>
            <div className="font-display text-lg font-black tracking-tight">{order.channel_order_id}</div>
          </div>
          <button onClick={onClose} className="text-[var(--fg-muted)] hover:text-[var(--fg)] text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            {items.map((it, i) => (
              <label key={i} className="flex items-center gap-3 border border-[var(--border)] p-3 text-[13px] cursor-pointer hover:bg-[var(--surface)]">
                <input type="checkbox" checked={it.selected} onChange={() => toggle(i)} data-testid={`ret-item-${i}`} />
                <div className="flex-1">
                  <div className="font-medium tabular">{it.master_sku}</div>
                  <div className="text-[11px] text-[var(--fg-muted)]">Purchased: {order.line_items[i].qty} × {"₹" + it.unit_price.toLocaleString("en-IN")}</div>
                </div>
                {it.selected && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--fg-muted)]">Qty</span>
                    <input type="number" value={it.qty} min={1} max={order.line_items[i].qty} onChange={e => setQty(i, e.target.value)} className="w-14 border border-[var(--border)] px-2 py-1 text-[12px] tabular" data-testid={`ret-qty-${i}`} />
                  </div>
                )}
              </label>
            ))}
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full mt-1 border border-[var(--border)] px-2.5 py-1.5 text-[13px] bg-white" data-testid="ret-reason">
              <option>Wrong item</option><option>Wrong size</option><option>Defective</option><option>Changed mind</option><option>Not as described</option>
            </select>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <span className="text-[13px]">Refund total: <span className="tabular font-bold text-[var(--danger)]">{"₹" + total.toLocaleString("en-IN")}</span></span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)]">Cancel</button>
              <button data-testid="submit-return" disabled={selected.length === 0} onClick={() => onSubmit(selected.map(({ master_id, master_sku, qty, refund_amount }) => ({ master_id, master_sku, qty, refund_amount })), reason)} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40">Create Return</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
