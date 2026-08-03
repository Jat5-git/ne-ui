import React, { useState } from "react";
import { X, Save, RefreshCw } from "lucide-react";
import { useStore } from "@/store/StoreContext";
import { ChannelChip } from "./Pills";
import ChannelAttributesEditor from "./ChannelAttributesEditor";
import { toast } from "sonner";

const CHANNEL_LIST = [
  { key: "amazon",      label: "Amazon India" },
  { key: "flipkart",    label: "Flipkart" },
  { key: "shopify",     label: "Shopify Store" },
  { key: "woocommerce", label: "WooCommerce" },
];

// Master Product editor with a "Sync to channels" flow.
// Edits product-level fields (title, mrp, cost, stock, weight, category, brand)
// PLUS channel attribute schema data, then optionally pushes selected fields to selected channel listings.
export default function EditProductModal({ product, onClose }) {
  const { updateProduct, pushProductToChannels, categories, brands } = useStore();
  const [tab, setTab] = useState("master"); // master | attributes | sync

  const [form, setForm] = useState({
    title: product.title,
    sku: product.sku,
    brand: product.brand,
    category: product.category,
    mrp: product.mrp,
    cost: product.cost,
    stock: product.stock,
    weight: product.weight,
  });
  const [attrValues, setAttrValues] = useState(product.channel_attributes || {});
  const [customAttrs, setCustomAttrs] = useState(product.custom_attributes || {});

  // Sync options
  const [syncChannels, setSyncChannels] = useState([...(product.channels || [])]);
  const [syncFields, setSyncFields] = useState({ title: true, price: true, stock: true });

  const save = () => {
    updateProduct(product.id, {
      title: form.title.trim(),
      sku: form.sku.trim().toUpperCase(),
      brand: form.brand,
      category: form.category,
      mrp: parseFloat(form.mrp) || 0,
      cost: parseFloat(form.cost) || 0,
      stock: parseInt(form.stock) || 0,
      weight: parseFloat(form.weight) || 0,
      channel_attributes: attrValues,
      custom_attributes: customAttrs,
    });
    toast.success("Product updated", { description: `${form.sku} saved to master inventory` });
  };

  const saveAndSync = () => {
    save();
    const fieldsSel = Object.entries(syncFields).filter(([, v]) => v).map(([k]) => k);
    if (syncChannels.length === 0 || fieldsSel.length === 0) {
      toast.info("Saved, no sync requested");
      onClose();
      return;
    }
    // Delay slightly so the state update commits before pushing
    setTimeout(() => {
      pushProductToChannels(product.id, syncChannels, fieldsSel);
      toast.success(`Synced to ${syncChannels.length} channel${syncChannels.length !== 1 ? "s" : ""}`, { description: fieldsSel.join(", ") });
      onClose();
    }, 80);
  };

  const toggleChannel = (k) => setSyncChannels(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  const toggleField = (k) => setSyncFields(prev => ({ ...prev, [k]: !prev[k] }));

  const availableChannels = CHANNEL_LIST.filter(c => (product.channels || []).includes(c.key));

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col border border-[var(--border)]" onClick={e => e.stopPropagation()} data-testid="edit-product-modal">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Edit Product</div>
            <div className="font-display font-black text-lg tracking-tight">{product.title}</div>
            <div className="text-[11px] text-[var(--fg-muted)] tabular">{product.sku}</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface)]" data-testid="edit-product-close"><X size={16} /></button>
        </div>

        <div className="border-b border-[var(--border)] flex gap-2 px-4">
          {["master", "attributes", "sync"].map(t => (
            <button key={t} data-testid={`ep-tab-${t}`} onClick={() => setTab(t)} className={`px-3 py-2.5 text-[12px] border-b-2 transition-colors capitalize ${tab === t ? "border-[var(--primary)] text-[var(--fg)] font-semibold" : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}>
              {t === "master" ? "Master fields" : t === "attributes" ? "Channel attributes" : "Sync to channels"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "master" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Title</span><input data-testid="ep-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)]" /></label>
              <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">SKU</span><input data-testid="ep-sku" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] tabular outline-none focus:border-[var(--primary)]" /></label>
              <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Weight (kg)</span><input data-testid="ep-weight" type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] tabular outline-none focus:border-[var(--primary)]" /></label>
              <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Brand</span><select data-testid="ep-brand" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] bg-white outline-none focus:border-[var(--primary)]">{brands.map(b => <option key={b.id}>{b.name}</option>)}</select></label>
              <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Category</span><select data-testid="ep-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] bg-white outline-none focus:border-[var(--primary)]">{categories.map(c => <option key={c.id}>{c.name}</option>)}</select></label>
              <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">MRP (₹)</span><input data-testid="ep-mrp" type="number" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] tabular outline-none focus:border-[var(--primary)]" /></label>
              <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Cost (₹)</span><input data-testid="ep-cost" type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] tabular outline-none focus:border-[var(--primary)]" /></label>
              <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">On-hand stock</span><input data-testid="ep-stock" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className="w-full mt-1 border border-[var(--border)] px-3 py-2 text-[13px] tabular outline-none focus:border-[var(--primary)]" /></label>
            </div>
          )}

          {tab === "attributes" && (
            <ChannelAttributesEditor
              category={form.category}
              values={attrValues}
              onChange={setAttrValues}
              customAttrs={customAttrs}
              onCustomChange={setCustomAttrs}
            />
          )}

          {tab === "sync" && (
            <div className="space-y-4">
              <div className="border border-[var(--border)] p-4">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-2">Channels to sync</div>
                {availableChannels.length === 0 && <div className="text-[12px] text-[var(--fg-muted)]">This product is not listed on any channel yet. Use the "List on Channel" button to publish first.</div>}
                <div className="space-y-2">
                  {availableChannels.map(c => (
                    <label key={c.key} data-testid={`ep-sync-${c.key}`} className={`flex items-center gap-3 p-2.5 border cursor-pointer ${syncChannels.includes(c.key) ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}>
                      <input type="checkbox" checked={syncChannels.includes(c.key)} onChange={() => toggleChannel(c.key)} />
                      <ChannelChip channel={c.key} />
                      <span className="text-[13px]">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="border border-[var(--border)] p-4">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-2">Fields to push</div>
                <div className="grid grid-cols-3 gap-2">
                  {[["title", "Title"], ["price", "Price (from MRP)"], ["stock", "Stock (central only)"]].map(([k, label]) => (
                    <label key={k} data-testid={`ep-sync-field-${k}`} className={`flex items-center gap-2 p-2 border cursor-pointer text-[12px] ${syncFields[k] ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}>
                      <input type="checkbox" checked={syncFields[k]} onChange={() => toggleField(k)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--fg-muted)]">Changes go to master inventory. Sync to push overrides to channel listings.</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white">Cancel</button>
            <button data-testid="ep-save" onClick={() => { save(); onClose(); }} className="px-3 py-1.5 text-[12px] border border-[var(--fg)] bg-white flex items-center gap-1.5"><Save size={12} />Save only</button>
            <button data-testid="ep-save-sync" onClick={saveAndSync} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5"><RefreshCw size={12} />Save &amp; Sync</button>
          </div>
        </div>
      </div>
    </div>
  );
}
