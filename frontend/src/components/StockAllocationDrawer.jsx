import React, { useState } from "react";
import { X, Boxes, Split, Zap, AlertTriangle, Check, Info } from "lucide-react";
import { useStore } from "@/store/StoreContext";
import { toast } from "sonner";
import { ChannelChip } from "./Pills";

export default function StockAllocationDrawer({ product, onClose }) {
  const { productStockView, setStockMode, updateCentralStock, updateChannelAllocation, autoBalance, setMasterPool, productListings } = useStore();
  const view = productStockView(product.id);
  const rows = productListings(product.id);
  const [mode, setMode] = useState(view.mode);
  const [masterInput, setMasterInput] = useState(view.total);

  const totalAllocated = rows.reduce((s, r) => s + r.stock, 0);
  const unallocated = Math.max(0, view.total - totalAllocated);
  const overAllocated = totalAllocated > view.total;

  const applyModeChange = (nextMode) => {
    if (nextMode === mode) return;
    setStockMode(product.id, nextMode);
    setMode(nextMode);
    toast.success(`Stock mode: ${nextMode === "central" ? "Central Pool" : "Allocated per Channel"}`, {
      description: nextMode === "central"
        ? "All channels now draw from a shared master pool."
        : "Master stock split across each connected channel.",
    });
  };

  const saveMaster = () => {
    const v = parseInt(masterInput) || 0;
    setMasterPool(product.id, v);
    updateCentralStock(product.id, v);
    toast.success(`Master pool set to ${v} units`);
  };

  const handleAllocChange = (channel, val) => {
    updateChannelAllocation(product.id, channel, parseInt(val) || 0);
  };

  const handleAutoBalance = () => {
    autoBalance(product.id);
    toast.success("Auto-balanced across all connected channels");
  };

  if (rows.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" data-testid="stock-drawer">
        <div className="bg-white w-full max-w-lg h-full flex flex-col border-l border-[var(--border)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Stock Allocation</div>
              <div className="font-display font-black text-lg tracking-tight mt-0.5">{product.title}</div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface)] rounded-sm" data-testid="stock-drawer-close"><X size={16} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <Boxes size={32} className="mx-auto mb-3 text-[var(--fg-muted)]" />
              <div className="text-[14px] font-medium mb-1">No channels yet</div>
              <div className="text-[12px] text-[var(--fg-muted)]">List this product to a channel first, then come back to configure allocations.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" data-testid="stock-drawer">
      <div className="bg-white w-full max-w-2xl h-full flex flex-col border-l border-[var(--border)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Stock Allocation</div>
            <div className="font-display font-black text-lg tracking-tight mt-0.5">{product.title}</div>
            <div className="text-[11px] text-[var(--fg-muted)] tabular mt-0.5">Master SKU {product.sku}</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface)] rounded-sm" data-testid="stock-drawer-close"><X size={16} /></button>
        </div>

        {/* Mode selector */}
        <div className="p-5 border-b border-[var(--border)]">
          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3">Inventory Mode</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              data-testid="mode-central"
              onClick={() => applyModeChange("central")}
              className={`text-left p-4 border transition-colors ${mode === "central" ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Boxes size={14} />
                  <span className="text-[13px] font-medium">Central Pool</span>
                </div>
                {mode === "central" && <Check size={14} className="text-[var(--primary)]" />}
              </div>
              <div className="text-[11px] text-[var(--fg-muted)] leading-relaxed">One shared inventory bucket. Every channel sees the same stock. First-sold-first-deducted.</div>
              <div className="mt-2 text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Best for: fast-moving SKUs, single warehouse</div>
            </button>
            <button
              data-testid="mode-allocated"
              onClick={() => applyModeChange("allocated")}
              className={`text-left p-4 border transition-colors ${mode === "allocated" ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Split size={14} />
                  <span className="text-[13px] font-medium">Allocated per Channel</span>
                </div>
                {mode === "allocated" && <Check size={14} className="text-[var(--primary)]" />}
              </div>
              <div className="text-[11px] text-[var(--fg-muted)] leading-relaxed">Dedicated buckets per channel. Amazon runs out ≠ Shopify runs out.</div>
              <div className="mt-2 text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Best for: reserved inventory, avoid oversell</div>
            </button>
          </div>
        </div>

        {/* Master pool */}
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Master Inventory Pool</div>
            <div className="text-[11px] text-[var(--fg-muted)] tabular">Warehouse: Bangalore FC</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-[var(--border)] focus-within:border-[var(--primary)] w-40">
              <input
                data-testid="master-pool-input"
                type="number"
                value={masterInput}
                onChange={e => setMasterInput(e.target.value)}
                className="flex-1 px-3 py-2 text-[16px] tabular font-display font-black outline-none"
              />
              <span className="px-2 py-2 text-[10px] uppercase tracking-widest text-[var(--fg-muted)] bg-[var(--surface)] border-l border-[var(--border)]">units</span>
            </div>
            <button data-testid="save-master-pool" onClick={saveMaster} className="px-3 py-2 text-[12px] bg-[var(--fg)] text-white hover:bg-black transition-colors">Save Pool</button>
            {mode === "allocated" && (
              <button data-testid="auto-balance" onClick={handleAutoBalance} className="px-3 py-2 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5 transition-colors ml-auto">
                <Zap size={12} />Auto-Balance
              </button>
            )}
          </div>
          {mode === "allocated" && (
            <div className="mt-3 flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[var(--fg)]"></span>
                <span className="text-[var(--fg-muted)]">Master:</span>
                <span className="tabular font-medium">{view.total}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[var(--primary)]"></span>
                <span className="text-[var(--fg-muted)]">Allocated:</span>
                <span className="tabular font-medium">{totalAllocated}</span>
              </div>
              <div className={`flex items-center gap-1.5 ${overAllocated ? "text-[var(--danger)]" : ""}`}>
                <span className={`w-2 h-2 ${overAllocated ? "bg-[var(--danger)]" : "bg-[var(--warning)]"}`}></span>
                <span className={overAllocated ? "" : "text-[var(--fg-muted)]"}>{overAllocated ? "Over by:" : "Unallocated:"}</span>
                <span className="tabular font-medium">{overAllocated ? totalAllocated - view.total : unallocated}</span>
              </div>
            </div>
          )}
          {overAllocated && (
            <div className="mt-3 flex items-start gap-2 p-2.5 border border-[var(--danger)] bg-[#FDECEA] text-[11px] text-[var(--danger)]">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>Allocated stock exceeds the master pool. Increase the pool or reduce channel allocations to prevent oversell.</span>
            </div>
          )}
        </div>

        {/* Channel allocations */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3">Channel Allocations ({rows.length})</div>
          {mode === "central" ? (
            <div className="border border-[var(--border)]">
              <div className="p-3 bg-[var(--surface)] border-b border-[var(--border)] flex items-start gap-2 text-[12px]">
                <Info size={13} className="text-[var(--primary)] mt-0.5 shrink-0" />
                <span>In <b>Central Pool</b> mode, all channels show the same live stock number ({view.total}) — no manual per-channel edits needed here.</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {rows.map(r => (
                  <div key={r.id} className="p-3 flex items-center justify-between" data-testid={`central-row-${r.channel}`}>
                    <div className="flex items-center gap-3">
                      <ChannelChip channel={r.channel} />
                      <span className="text-[13px] font-medium">{r.channel_label}</span>
                      <span className="text-[11px] text-[var(--fg-muted)] tabular">{r.channel_sku}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--fg-muted)]">Live stock</span>
                      <span className={`tabular font-medium text-[15px] ${view.total === 0 ? "text-[var(--danger)]" : ""}`}>{view.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-[var(--border)]">
              <table className="w-full text-[13px]" data-testid="allocation-table">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                    <th className="p-2.5 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channel</th>
                    <th className="p-2.5 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channel SKU</th>
                    <th className="p-2.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Allocation</th>
                    <th className="p-2.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">% of Master</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const pct = view.total > 0 ? (r.stock / view.total) * 100 : 0;
                    return (
                      <tr key={r.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)]" data-testid={`alloc-row-${r.channel}`}>
                        <td className="p-2.5"><ChannelChip channel={r.channel} /></td>
                        <td className="p-2.5 tabular text-[11px] text-[var(--fg-muted)]">{r.channel_sku}</td>
                        <td className="p-2.5">
                          <div className="flex items-center border border-[var(--border)] focus-within:border-[var(--primary)] w-24 ml-auto">
                            <input
                              data-testid={`alloc-input-${r.channel}`}
                              type="number"
                              value={r.stock}
                              onChange={e => handleAllocChange(r.channel, e.target.value)}
                              className={`flex-1 px-2 py-1 text-[13px] tabular text-right outline-none w-full ${r.stock === 0 ? "text-[var(--danger)]" : ""}`}
                            />
                          </div>
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-[var(--surface-2)] relative">
                              <div className="absolute inset-y-0 left-0 bg-[var(--primary)]" style={{ width: `${Math.min(100, pct)}%` }}></div>
                            </div>
                            <span className="tabular text-[11px] text-[var(--fg-muted)] w-10 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--fg-muted)] tabular">
            {mode === "central"
              ? `1 shared pool · ${rows.length} channels`
              : `${rows.length} channels · ${totalAllocated}/${view.total} units allocated`}
          </span>
          <button onClick={onClose} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">Done</button>
        </div>
      </div>
    </div>
  );
}
