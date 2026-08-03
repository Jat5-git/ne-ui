import React, { useState } from "react";
import { X, Save, HelpCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useStore } from "@/store/StoreContext";
import ImageUploader from "./ImageUploader";
import ProductionGuide from "./ProductionGuide";
import ChannelAttributesEditor from "./ChannelAttributesEditor";
import { toast } from "sonner";

const FALLBACK_IMG = "https://images.pexels.com/photos/12628400/pexels-photo-12628400.jpeg?auto=compress&cs=tinysrgb&w=300";

export default function NewProductModal({ onClose }) {
  const { categories, brands, addProducts } = useStore();
  const [form, setForm] = useState({
    title: "",
    sku: "",
    brand: brands[0]?.name || "",
    category: categories[0]?.name || "",
    mrp: "",
    cost: "",
    stock: "",
    weight: "",
    stock_mode: "central",
    status: "draft",
    images: [],
    option_axes: [],
  });
  const [errors, setErrors] = useState({});
  const [showGuide, setShowGuide] = useState(false);
  const [showAttrs, setShowAttrs] = useState(true);
  const [channelAttrs, setChannelAttrs] = useState({});
  const [customAttrs, setCustomAttrs] = useState({});

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.sku.trim()) errs.sku = "SKU is required";
    if (!form.mrp || parseFloat(form.mrp) <= 0) errs.mrp = "Enter a valid MRP";
    if (!form.cost || parseFloat(form.cost) < 0) errs.cost = "Enter a valid cost";
    if (!form.stock || parseInt(form.stock) < 0) errs.stock = "Enter a stock quantity";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    const primary = form.images[0] || FALLBACK_IMG;
    const product = {
      id: `mp_new_${Date.now()}`,
      sku: form.sku.trim().toUpperCase(),
      title: form.title.trim(),
      brand: form.brand,
      category: form.category,
      mrp: parseFloat(form.mrp),
      cost: parseFloat(form.cost),
      stock: parseInt(form.stock),
      weight: parseFloat(form.weight) || 0,
      image: primary,
      images: form.images.length ? form.images : [FALLBACK_IMG],
      channels: [],
      status: form.status,
      stock_mode: form.stock_mode,
      option_axes: form.option_axes,
      updated: new Date().toISOString().slice(0, 10),
      channel_attributes: channelAttrs,
      custom_attributes: customAttrs,
    };
    addProducts([product]);
    const totalFilled = Object.values(channelAttrs).reduce((n, section) => n + Object.keys(section || {}).length, 0);
    toast.success(`${product.title} created`, { description: `${form.images.length || 0} images · ${totalFilled} channel attributes filled · SKU ${product.sku}` });
    onClose();
  };

  const inputCls = (field) => `w-full border px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] tabular ${errors[field] ? "border-[var(--danger)] bg-[#FDECEA]" : "border-[var(--border)]"}`;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-6" data-testid="new-product-modal">
        <div className="bg-white w-full max-w-6xl max-h-[92vh] flex flex-col border border-[var(--border)]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Central Inventory</div>
              <div className="font-display font-black text-lg tracking-tight mt-0.5">Create New Product</div>
            </div>
            <div className="flex items-center gap-2">
              <button data-testid="open-guide" onClick={() => setShowGuide(true)} className="px-3 py-1.5 text-[11px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5 transition-colors">
                <HelpCircle size={12} />Production Guide
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface)] rounded-sm" data-testid="new-product-close"><X size={16} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left column — attributes */}
            <div className="space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3">Master Attributes</div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-[11px] font-medium text-[var(--fg-muted)]">Product Title <span className="text-[var(--danger)]">*</span></span>
                    <input data-testid="np-title" value={form.title} onChange={e => update("title", e.target.value)} placeholder="e.g., Stride Velocity Runner V4" className={inputCls("title").replace("tabular", "")} />
                    {errors.title && <span className="text-[10px] text-[var(--danger)] mt-1 block">{errors.title}</span>}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[11px] font-medium text-[var(--fg-muted)]">Master SKU <span className="text-[var(--danger)]">*</span></span>
                      <input data-testid="np-sku" value={form.sku} onChange={e => update("sku", e.target.value)} placeholder="STR-RUN-004" className={inputCls("sku")} />
                      {errors.sku && <span className="text-[10px] text-[var(--danger)] mt-1 block">{errors.sku}</span>}
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-medium text-[var(--fg-muted)]">Weight (kg)</span>
                      <input data-testid="np-weight" type="number" step="0.01" value={form.weight} onChange={e => update("weight", e.target.value)} placeholder="0.42" className={inputCls("weight")} />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[11px] font-medium text-[var(--fg-muted)]">Brand</span>
                      <select data-testid="np-brand" value={form.brand} onChange={e => update("brand", e.target.value)} className={inputCls("brand").replace("tabular", "") + " bg-white"}>
                        {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-medium text-[var(--fg-muted)]">Category</span>
                      <select data-testid="np-category" value={form.category} onChange={e => update("category", e.target.value)} className={inputCls("category").replace("tabular", "") + " bg-white"}>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block">
                      <span className="text-[11px] font-medium text-[var(--fg-muted)]">MRP (₹) <span className="text-[var(--danger)]">*</span></span>
                      <input data-testid="np-mrp" type="number" value={form.mrp} onChange={e => update("mrp", e.target.value)} placeholder="6499" className={inputCls("mrp")} />
                      {errors.mrp && <span className="text-[10px] text-[var(--danger)] mt-1 block">{errors.mrp}</span>}
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-medium text-[var(--fg-muted)]">Cost (₹) <span className="text-[var(--danger)]">*</span></span>
                      <input data-testid="np-cost" type="number" value={form.cost} onChange={e => update("cost", e.target.value)} placeholder="2100" className={inputCls("cost")} />
                      {errors.cost && <span className="text-[10px] text-[var(--danger)] mt-1 block">{errors.cost}</span>}
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-medium text-[var(--fg-muted)]">Stock <span className="text-[var(--danger)]">*</span></span>
                      <input data-testid="np-stock" type="number" value={form.stock} onChange={e => update("stock", e.target.value)} placeholder="240" className={inputCls("stock")} />
                      {errors.stock && <span className="text-[10px] text-[var(--danger)] mt-1 block">{errors.stock}</span>}
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-2">Inventory Mode</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-start gap-2 p-3 border cursor-pointer transition-colors ${form.stock_mode === "central" ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}>
                    <input type="radio" checked={form.stock_mode === "central"} onChange={() => update("stock_mode", "central")} data-testid="np-mode-central" className="mt-0.5" />
                    <div>
                      <div className="text-[12px] font-medium">Central Pool</div>
                      <div className="text-[10px] text-[var(--fg-muted)]">Shared across all channels</div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-2 p-3 border cursor-pointer transition-colors ${form.stock_mode === "allocated" ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}>
                    <input type="radio" checked={form.stock_mode === "allocated"} onChange={() => update("stock_mode", "allocated")} data-testid="np-mode-allocated" className="mt-0.5" />
                    <div>
                      <div className="text-[12px] font-medium">Allocated per Channel</div>
                      <div className="text-[10px] text-[var(--fg-muted)]">Dedicated buckets</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-3 border border-[var(--border)] bg-[var(--surface)] flex items-start gap-2 text-[11px] text-[var(--fg-muted)]">
                <Info size={12} className="text-[var(--primary)] mt-0.5 shrink-0" />
                Variants (Size, Color, Style) can be added after creation from the Variants drawer — new SKUs will be auto-generated from your master SKU.
              </div>
            </div>

            {/* Right column — images */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3">Product Images (max 6)</div>
              <ImageUploader value={form.images} onChange={imgs => update("images", imgs)} max={6} />
            </div>
          </div>

          {/* Channel-specific attributes (full width, below the 2-col form) */}
          <div className="border-t border-[var(--border)]">
            <button
              data-testid="toggle-channel-attrs"
              onClick={() => setShowAttrs(v => !v)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-[var(--surface)] transition-colors"
            >
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Channel-Specific Schema</div>
                <div className="text-[13px] font-medium mt-0.5">Amazon · Flipkart · Shopify · WooCommerce attributes for <span className="text-[var(--primary)]">{form.category}</span></div>
              </div>
              {showAttrs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showAttrs && (
              <div className="px-6 pb-6">
                <ChannelAttributesEditor
                  category={form.category}
                  values={channelAttrs}
                  onChange={setChannelAttrs}
                  customAttrs={customAttrs}
                  onCustomChange={setCustomAttrs}
                />
              </div>
            )}
          </div>
          </div>

          <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--fg-muted)] tabular">
              {form.images.length} image{form.images.length !== 1 ? "s" : ""} · SKU {form.sku || "(pending)"}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white">Cancel</button>
              <button data-testid="np-save" onClick={save} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5">
                <Save size={12} />Create Product
              </button>
            </div>
          </div>
        </div>
      </div>

      {showGuide && <ProductionGuide onClose={() => setShowGuide(false)} />}
    </>
  );
}
