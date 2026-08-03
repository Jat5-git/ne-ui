import React, { useState } from "react";
import { X, Layers } from "lucide-react";
import { useStore } from "@/store/StoreContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function CreateSegmentModal({ productIds, onClose }) {
  const { createSegment, products } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = () => {
    if (!name.trim()) { toast.error("Segment name is required"); return; }
    const id = createSegment(name.trim(), description.trim(), productIds);
    toast.success(`Segment "${name}" created`, { description: `${productIds.length} products bundled` });
    onClose();
    navigate(`/segments/${id}`);
  };

  const previews = productIds.slice(0, 4).map(pid => products.find(p => p.id === pid)).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md border border-[var(--border)]" onClick={e => e.stopPropagation()} data-testid="create-segment-modal">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[var(--primary)]" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Create Segment</div>
              <div className="font-display font-black text-base tracking-tight">Group {productIds.length} products</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface)]"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Segment name *</span><input data-testid="cs-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Summer Collection" className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)]" autoFocus /></label>
          <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Description</span><textarea data-testid="cs-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What is this segment for?" className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] resize-y" /></label>
          {previews.length > 0 && (
            <div className="border border-[var(--border)] p-3">
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-2">Preview</div>
              <div className="flex gap-2">
                {previews.map(p => (
                  <div key={p.id} className="flex-1 min-w-0"><img src={p.image} alt="" className="w-full h-14 object-cover border border-[var(--border)]" /><div className="text-[10px] mt-1 truncate">{p.sku}</div></div>
                ))}
                {productIds.length > 4 && <div className="flex-1 flex items-center justify-center text-[11px] text-[var(--fg-muted)] tabular border border-dashed border-[var(--border)]">+{productIds.length - 4}</div>}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white">Cancel</button>
          <button data-testid="cs-submit" onClick={submit} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white">Create Segment</button>
        </div>
      </div>
    </div>
  );
}
