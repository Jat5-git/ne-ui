import React, { useState } from "react";
import { X, Save, HelpCircle, Info, Check } from "lucide-react";
import { useStore } from "@/store/StoreContext";
import ImageUploader from "./ImageUploader";
import ProductionGuide from "./ProductionGuide";
import { ChannelChip } from "./Pills";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const FALLBACK_IMG = "https://images.pexels.com/photos/12628400/pexels-photo-12628400.jpeg?auto=compress&cs=tinysrgb&w=300";
const CHANNEL_LIST = [
  { key: "amazon",      label: "Amazon India" },
  { key: "flipkart",    label: "Flipkart" },
  { key: "shopify",     label: "Shopify Store" },
  { key: "woocommerce", label: "WooCommerce" },
];

export default function NewProductModal({ onClose }) {
  const { categories, brands, addProducts, attributesForChannels, addAttribute } = useStore();
  const [step, setStep] = useState(1); // 1=channels, 2=details
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [attrValues, setAttrValues] = useState({});
  const [form, setForm] = useState({
    title: "", sku: "", brand: brands[0]?.name || "", category: categories[0]?.name || "",
    mrp: "", cost: "", stock: "", weight: "", stock_mode: "central", status: "draft",
    images: [], option_axes: [],
  });
  const [errors, setErrors] = useState({});
  const [showGuide, setShowGuide] = useState(false);
  const [addingAttr, setAddingAttr] = useState(false);
  const [newAttr, setNewAttr] = useState({ label: "", type: "text" });

  const attrs = attributesForChannels(selectedChannels);
  const required = attrs.filter(a => a.required);
  const filled = required.filter(a => attrValues[a.key] !== undefined && attrValues[a.key] !== "").length;

  const toggleChannel = (k) => {
    setSelectedChannels(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "required";
    if (!form.sku.trim()) errs.sku = "required";
    if (!form.mrp || parseFloat(form.mrp) <= 0) errs.mrp = "required";
    if (!form.cost || parseFloat(form.cost) < 0) errs.cost = "required";
    if (!form.stock || parseInt(form.stock) < 0) errs.stock = "required";
    for (const a of required) {
      if (attrValues[a.key] === undefined || attrValues[a.key] === "") errs[`attr_${a.key}`] = "required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = () => {
    if (!validate()) { toast.error("Please fix required fields"); return; }
    const primary = form.images[0] || FALLBACK_IMG;
    const product = {
      id: `mp_new_${Date.now()}`,
      sku: form.sku.trim().toUpperCase(),
      title: form.title.trim(),
      brand: form.brand, category: form.category,
      mrp: parseFloat(form.mrp), cost: parseFloat(form.cost), stock: parseInt(form.stock),
      weight: parseFloat(form.weight) || 0,
      image: primary,
      images: form.images.length ? form.images : [FALLBACK_IMG],
      channels: selectedChannels,
      status: selectedChannels.length ? "listed" : "draft",
      stock_mode: form.stock_mode,
      option_axes: form.option_axes,
      updated: new Date().toISOString().slice(0, 10),
      channel_attributes: attrValues,
      publish_channels: selectedChannels,
    };
    addProducts([product]);
    toast.success(`${product.title} created`, { description: `${selectedChannels.length} channel(s) · ${Object.keys(attrValues).length} attributes filled` });
    onClose();
  };

  const inputCls = (field) => `w-full border px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] ${errors[field] ? "border-[var(--danger)] bg-[#FDECEA]" : "border-[var(--border)]"}`;

  const createInlineAttr = () => {
    if (!newAttr.label.trim()) return;
    const key = newAttr.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    addAttribute({ key, label: newAttr.label.trim(), type: newAttr.type, options: [], channels: selectedChannels.length ? selectedChannels : ["global"], required: false, hint: "" });
    toast.success(`Attribute "${newAttr.label}" added to central schema`, { description: "Now visible on this modal + CSV wizard + all future products." });
    setNewAttr({ label: "", type: "text" });
    setAddingAttr(false);
  };

  const renderAttrField = (a) => {
    const v = attrValues[a.key] ?? "";
    const set = (val) => setAttrValues(p => ({ ...p, [a.key]: val }));
    const err = errors[`attr_${a.key}`];
    const cls = `w-full border px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--primary)] ${err ? "border-[var(--danger)] bg-[#FDECEA]" : "border-[var(--border)]"}`;
    if (a.type === "select") return <select value={v} onChange={e => set(e.target.value)} className={cls + " bg-white"}><option value="">— Select —</option>{a.options.map(o => <option key={o} value={o}>{o}</option>)}</select>;
    if (a.type === "multiselect") return <div className={`${cls} bg-white flex flex-wrap gap-1 min-h-[34px] py-1.5`}>{a.options.map(o => { const arr = Array.isArray(v) ? v : []; const on = arr.includes(o); return <button type="button" key={o} onClick={() => set(on ? arr.filter(x => x !== o) : [...arr, o])} className={`px-2 py-0.5 text-[10px] border ${on ? "bg-[var(--fg)] text-white border-[var(--fg)]" : "border-[var(--border)]"}`}>{o}</button>; })}</div>;
    if (a.type === "textarea") return <textarea value={v} onChange={e => set(e.target.value)} rows={2} className={cls + " resize-y"} />;
    if (a.type === "checkbox") return <label className="flex items-center gap-2 border border-[var(--border)] p-2 bg-white cursor-pointer"><input type="checkbox" checked={!!v} onChange={e => set(e.target.checked)} /><span className="text-[12px]">{v ? "Yes" : "No"}</span></label>;
    if (a.type === "number") return <input type="number" value={v} onChange={e => set(e.target.value === "" ? "" : parseFloat(e.target.value))} className={cls + " tabular"} />;
    return <input type="text" value={v} onChange={e => set(e.target.value)} className={cls} />;
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-6" data-testid="new-product-modal">
        <div className="bg-white w-full max-w-5xl max-h-[92vh] flex flex-col border border-[var(--border)]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Central Inventory · Step {step} of 2</div>
              <div className="font-display font-black text-lg tracking-tight mt-0.5">
                {step === 1 ? "Choose channels to publish on" : "Product details & attributes"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button data-testid="open-guide" onClick={() => setShowGuide(true)} className="px-3 py-1.5 text-[11px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5"><HelpCircle size={12} />Production Guide</button>
              <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface)]" data-testid="new-product-close"><X size={16} /></button>
            </div>
          </div>

          {/* Stepper */}
          <div className="px-6 py-3 border-b border-[var(--border)] flex items-center gap-2 text-[12px]">
            <div className={`flex items-center gap-1.5 ${step === 1 ? "text-[var(--primary)] font-semibold" : "text-[var(--fg)]"}`}>
              <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold ${step === 1 ? "bg-[var(--primary)] text-white" : "bg-[var(--fg)] text-white"}`}>{step > 1 ? <Check size={10} /> : "1"}</span>
              Channels ({selectedChannels.length})
            </div>
            <div className={`flex-1 h-px ${step > 1 ? "bg-[var(--fg)]" : "bg-[var(--border)]"}`} />
            <div className={`flex items-center gap-1.5 ${step === 2 ? "text-[var(--primary)] font-semibold" : "text-[var(--fg-muted)]"}`}>
              <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold ${step === 2 ? "bg-[var(--primary)] text-white" : "border border-[var(--border)]"}`}>2</span>
              Details & Attributes
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {step === 1 && (
              <div className="p-6 space-y-4">
                <div className="text-[13px] text-[var(--fg-muted)]">Pick where this product will be listed. The attribute form on the next step is filtered to show only the fields your selected channels need — plus all global fields.</div>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${selectedChannels.length === 0 ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}>
                    <input type="radio" checked={selectedChannels.length === 0} onChange={() => setSelectedChannels([])} data-testid="ch-none" className="mt-0.5" />
                    <div>
                      <div className="text-[13px] font-medium">Save to Master only (no channels)</div>
                      <div className="text-[11px] text-[var(--fg-muted)]">Just create the SKU in central inventory. You can list to channels later.</div>
                    </div>
                  </label>
                  {CHANNEL_LIST.map(c => {
                    const on = selectedChannels.includes(c.key);
                    return (
                      <label key={c.key} data-testid={`ch-opt-${c.key}`} className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${on ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}>
                        <input type="checkbox" checked={on} onChange={() => toggleChannel(c.key)} className="mt-0.5" />
                        <div className="flex items-center gap-2"><ChannelChip channel={c.key} /><span className="text-[13px] font-medium">{c.label}</span></div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Master Attributes</div>
                    <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Product Title *</span><input data-testid="np-title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inputCls("title")} /></label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">SKU *</span><input data-testid="np-sku" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className={inputCls("sku") + " tabular"} /></label>
                      <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Weight (kg)</span><input data-testid="np-weight" type="number" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} className={inputCls("weight") + " tabular"} /></label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Brand</span><select data-testid="np-brand" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className={inputCls("brand") + " bg-white"}>{brands.map(b => <option key={b.id}>{b.name}</option>)}</select></label>
                      <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Category</span><select data-testid="np-category" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputCls("category") + " bg-white"}>{categories.map(c => <option key={c.id}>{c.name}</option>)}</select></label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">MRP (₹) *</span><input data-testid="np-mrp" type="number" value={form.mrp} onChange={e => setForm({...form, mrp: e.target.value})} className={inputCls("mrp") + " tabular"} /></label>
                      <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Cost (₹) *</span><input data-testid="np-cost" type="number" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} className={inputCls("cost") + " tabular"} /></label>
                      <label className="block"><span className="text-[11px] font-medium text-[var(--fg-muted)]">Stock *</span><input data-testid="np-stock" type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className={inputCls("stock") + " tabular"} /></label>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-2">Product Images (max 6)</div>
                    <ImageUploader value={form.images} onChange={imgs => setForm({...form, images: imgs})} max={6} />
                  </div>
                </div>

                {/* Attributes from central store, filtered by chosen channels */}
                <div className="border border-[var(--border)]" data-testid="channel-attrs-editor">
                  <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Channel Attributes</div>
                      <div className="text-[13px] font-medium mt-0.5">
                        {selectedChannels.length === 0
                          ? <span>Showing <b>global only</b> — <Link to="/settings" className="text-[var(--primary)] hover:underline" onClick={onClose}>manage schema</Link></span>
                          : <span>{attrs.length} attributes for {selectedChannels.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Required Filled</div>
                      <div className="tabular font-medium mt-0.5">{filled}/{required.length}</div>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {attrs.length === 0 && <div className="col-span-full text-[12px] text-[var(--fg-muted)] text-center py-4">No attributes yet — <Link to="/settings" onClick={onClose} className="text-[var(--primary)] hover:underline">add one in Settings</Link></div>}
                    {attrs.map(a => (
                      <div key={a.id} className={a.type === "textarea" ? "md:col-span-2" : ""} data-testid={`attr-input-${a.key}`}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[11px] font-medium">{a.label}{a.required && <span className="text-[var(--danger)] ml-0.5">*</span>}</span>
                          <span className="text-[9px] text-[var(--fg-muted)] flex gap-1">{a.channels.map(c => c === "global" ? <span key={c} className="uppercase tracking-widest">Global</span> : <ChannelChip key={c} channel={c} />)}</span>
                        </div>
                        {renderAttrField(a)}
                        {a.hint && !errors[`attr_${a.key}`] && <span className="text-[10px] text-[var(--fg-muted)] mt-0.5 block">{a.hint}</span>}
                      </div>
                    ))}

                    {/* Inline add-attribute — persists to global store */}
                    {addingAttr ? (
                      <div className="col-span-full border border-[var(--primary)] bg-[#F0F4FF] p-3 flex gap-2 items-end">
                        <label className="flex-1"><span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Label</span><input data-testid="np-new-attr-label" value={newAttr.label} onChange={e => setNewAttr({...newAttr, label: e.target.value})} placeholder="e.g., Fabric GSM" className="w-full mt-1 border border-[var(--border)] px-2 py-1 text-[12px]" /></label>
                        <select value={newAttr.type} onChange={e => setNewAttr({...newAttr, type: e.target.value})} className="border border-[var(--border)] px-2 py-1 text-[12px] bg-white">{["text","number","textarea","checkbox"].map(t => <option key={t} value={t}>{t}</option>)}</select>
                        <button data-testid="np-new-attr-save" onClick={createInlineAttr} className="px-3 py-1 text-[12px] bg-[var(--primary)] text-white">Add to Schema</button>
                        <button onClick={() => setAddingAttr(false)} className="px-3 py-1 text-[12px] border border-[var(--border)] bg-white">Cancel</button>
                      </div>
                    ) : (
                      <button data-testid="np-add-attr" onClick={() => setAddingAttr(true)} className="col-span-full py-2 border border-dashed border-[var(--border)] text-[12px] text-[var(--fg-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] flex items-center justify-center gap-1.5">
                        + Add missing attribute (saves to central schema)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--fg-muted)] tabular">
              {step === 1 ? `${selectedChannels.length} channel${selectedChannels.length !== 1 ? "s" : ""} selected` : `${filled}/${required.length} required · ${form.images.length} images`}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white">Cancel</button>
              {step === 1 && <button data-testid="np-next" onClick={() => setStep(2)} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">Continue →</button>}
              {step === 2 && (<><button data-testid="np-back" onClick={() => setStep(1)} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white">← Back</button><button data-testid="np-save" onClick={save} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5"><Save size={12} />Create Product</button></>)}
            </div>
          </div>
        </div>
      </div>
      {showGuide && <ProductionGuide onClose={() => setShowGuide(false)} />}
    </>
  );
}
