import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { useStore } from "@/store/StoreContext";
import { ChannelChip } from "./Pills";
import { toast } from "sonner";

// Inline edit for a single channel listing row
export default function EditListingModal({ listing, onClose }) {
  const { updateListing } = useStore();
  const [form, setForm] = useState({
    channel_sku: listing.channel_sku,
    title: listing.title,
    price: listing.price,
    stock: listing.stock,
    status: listing.status,
  });

  const save = () => {
    updateListing(listing.id, {
      channel_sku: form.channel_sku.trim(),
      title: form.title.trim(),
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock) || 0,
      status: form.status,
    });
    toast.success(`${listing.channel_sku} updated on ${listing.channel_label}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg border border-[var(--border)]" onClick={e => e.stopPropagation()} data-testid="edit-listing-modal">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold flex items-center gap-1.5">Edit listing · <ChannelChip channel={listing.channel} /></div>
            <div className="font-display font-black text-base tracking-tight mt-0.5">{listing.title}</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface)]"><X size={15} /></button>
        </div>

        <div className="p-5 space-y-3">
          <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Channel SKU</span><input data-testid="el-sku" value={form.channel_sku} onChange={e => setForm(f => ({ ...f, channel_sku: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] tabular outline-none focus:border-[var(--primary)]" /></label>
          <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Channel title (override)</span><input data-testid="el-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)]" /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Price (₹)</span><input data-testid="el-price" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] tabular outline-none focus:border-[var(--primary)]" /></label>
            <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Stock (channel)</span><input data-testid="el-stock" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] tabular outline-none focus:border-[var(--primary)]" /></label>
          </div>
          <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Status</span><select data-testid="el-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] bg-white outline-none focus:border-[var(--primary)]"><option value="active">Active</option><option value="paused">Paused</option><option value="error">Error</option></select></label>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white">Cancel</button>
          <button data-testid="el-save" onClick={save} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white flex items-center gap-1.5"><Save size={12} />Save & Push</button>
        </div>
      </div>
    </div>
  );
}
