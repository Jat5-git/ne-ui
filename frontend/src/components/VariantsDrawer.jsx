import React, { useState } from "react";
import { X, Plus, Trash2, Layers, Radio } from "lucide-react";
import { useStore } from "@/store/StoreContext";
import { toast } from "sonner";
import { ChannelChip } from "./Pills";

export default function VariantsDrawer({ product, onClose }) {
  const { getVariants, updateVariant, deleteVariant, addOptionValue, addAxis } = useStore();
  const variants = getVariants(product.id);
  const [newValue, setNewValue] = useState({});
  const [newAxis, setNewAxis] = useState("");
  const [showAddAxis, setShowAddAxis] = useState(false);

  const axes = product.option_axes || [];
  const stockTotal = variants.reduce((s, v) => s + v.stock, 0);
  const outOfStock = variants.filter(v => v.stock === 0).length;

  const handleAddValue = (axisName) => {
    const val = (newValue[axisName] || "").trim();
    if (!val) return;
    addOptionValue(product.id, axisName, val);
    setNewValue(p => ({ ...p, [axisName]: "" }));
    toast.success(`Added ${axisName}: ${val}`, { description: "New variant SKUs generated." });
  };

  const handleAddAxis = () => {
    if (!newAxis.trim()) return;
    addAxis(product.id, newAxis.trim());
    setNewAxis("");
    setShowAddAxis(false);
    toast.success(`Option axis "${newAxis.trim()}" added`);
  };

  const handlePush = () => {
    toast.success(`${variants.length} variants queued for channel sync`, {
      description: `Each channel will receive individual SKUs for ${product.channels.length} marketplaces.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" data-testid="variants-drawer">
      <div className="bg-white w-full max-w-3xl h-full flex flex-col border-l border-[var(--border)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Variant Management</div>
            <div className="font-display font-black text-lg tracking-tight mt-0.5">{product.title}</div>
            <div className="text-[11px] text-[var(--fg-muted)] tabular mt-0.5">Master SKU {product.sku}</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface)] rounded-sm" data-testid="variants-close"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-4 border-b border-[var(--border)]">
          <div className="p-4 border-r border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Option Axes</div>
            <div className="text-2xl font-display font-black tabular mt-1">{axes.length}</div>
          </div>
          <div className="p-4 border-r border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Total Variants</div>
            <div className="text-2xl font-display font-black tabular mt-1">{variants.length}</div>
          </div>
          <div className="p-4 border-r border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Aggregate Stock</div>
            <div className="text-2xl font-display font-black tabular mt-1">{stockTotal}</div>
          </div>
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Out of Stock</div>
            <div className={`text-2xl font-display font-black tabular mt-1 ${outOfStock > 0 ? "text-[var(--danger)]" : ""}`}>{outOfStock}</div>
          </div>
        </div>

        <div className="p-5 border-b border-[var(--border)]">
          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-3 flex items-center gap-1.5"><Layers size={11} />Option Axes</div>
          <div className="space-y-3">
            {axes.map(axis => (
              <div key={axis.name} className="border border-[var(--border)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[13px] font-medium">{axis.name}</div>
                  <div className="text-[11px] text-[var(--fg-muted)] tabular">{axis.values.length} values</div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {axis.values.map(v => <span key={v} className="chip">{v}</span>)}
                  {axis.values.length === 0 && <span className="text-[11px] text-[var(--fg-muted)] italic">No values yet</span>}
                </div>
                <div className="flex gap-2">
                  <input
                    data-testid={`add-value-${axis.name}`}
                    value={newValue[axis.name] || ""}
                    onChange={e => setNewValue(p => ({ ...p, [axis.name]: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && handleAddValue(axis.name)}
                    placeholder={`New ${axis.name.toLowerCase()}…`}
                    className="flex-1 border border-[var(--border)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--primary)]"
                  />
                  <button
                    data-testid={`add-value-btn-${axis.name}`}
                    onClick={() => handleAddValue(axis.name)}
                    className="px-2.5 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1"
                  >
                    <Plus size={11} />Add
                  </button>
                </div>
              </div>
            ))}
            {axes.length === 0 && <div className="text-[12px] text-[var(--fg-muted)] italic p-3 border border-dashed border-[var(--border)] text-center">No option axes yet. Add Size, Color, Style, or a custom axis to start.</div>}
            {showAddAxis ? (
              <div className="flex gap-2">
                <input
                  data-testid="new-axis-input"
                  value={newAxis}
                  onChange={e => setNewAxis(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddAxis()}
                  placeholder="Axis name (e.g., Material)"
                  className="flex-1 border border-[var(--border)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--primary)]"
                />
                <button data-testid="new-axis-save" onClick={handleAddAxis} className="px-2.5 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">Create Axis</button>
                <button onClick={() => { setShowAddAxis(false); setNewAxis(""); }} className="px-2.5 py-1.5 text-[12px] border border-[var(--border)] bg-white">Cancel</button>
              </div>
            ) : (
              <button data-testid="new-axis-btn" onClick={() => setShowAddAxis(true)} className="w-full px-3 py-2 text-[12px] border border-dashed border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] flex items-center justify-center gap-1.5 transition-colors">
                <Plus size={12} />New Option Axis
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]">
            <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Variant SKUs ({variants.length})</span>
            {product.channels.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">{product.channels.map(c => <ChannelChip key={c} channel={c} />)}</div>
              </div>
            )}
          </div>
          <table className="w-full text-[13px]" data-testid="variants-table">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {axes.map(a => <th key={a.name} className="p-2.5 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">{a.name}</th>)}
                <th className="p-2.5 text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Variant SKU</th>
                <th className="p-2.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Stock</th>
                <th className="p-2.5 text-right text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Price</th>
                <th className="p-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {variants.map(v => (
                <tr key={v.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)]" data-testid={`variant-row-${v.id}`}>
                  {axes.map(a => (
                    <td key={a.name} className="p-2.5">
                      <span className="chip">{v.options[a.name] || "—"}</span>
                    </td>
                  ))}
                  <td className="p-2.5 tabular text-[11px]">{v.sku}</td>
                  <td className="p-2.5">
                    <input
                      data-testid={`variant-stock-${v.id}`}
                      type="number"
                      value={v.stock}
                      onChange={e => updateVariant(product.id, v.id, { stock: parseInt(e.target.value) || 0 })}
                      className={`w-20 border border-[var(--border)] px-2 py-1 text-[12px] tabular text-right outline-none focus:border-[var(--primary)] ${v.stock === 0 ? "text-[var(--danger)]" : ""}`}
                    />
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center border border-[var(--border)] focus-within:border-[var(--primary)] w-28 ml-auto">
                      <span className="px-1.5 py-1 text-[11px] tabular text-[var(--fg-muted)] bg-[var(--surface)] border-r border-[var(--border)]">₹</span>
                      <input
                        data-testid={`variant-price-${v.id}`}
                        type="number"
                        value={v.price}
                        onChange={e => updateVariant(product.id, v.id, { price: parseFloat(e.target.value) || 0 })}
                        className="flex-1 px-2 py-1 text-[12px] tabular text-right outline-none w-full"
                      />
                    </div>
                  </td>
                  <td className="p-2.5">
                    <button data-testid={`variant-delete-${v.id}`} onClick={() => { deleteVariant(product.id, v.id); toast.info("Variant deleted"); }} className="p-1 hover:bg-[#FDECEA] hover:text-[var(--danger)] rounded-sm">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {variants.length === 0 && (
                <tr><td colSpan={axes.length + 4} className="p-8 text-center text-[12px] text-[var(--fg-muted)]">No variants yet. Add option values above to auto-generate them.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--fg-muted)] tabular">
            {variants.length} variants × {product.channels.length} channels = <b>{variants.length * product.channels.length}</b> total channel SKUs
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white">Close</button>
            <button data-testid="push-variants" disabled={variants.length === 0 || product.channels.length === 0} onClick={handlePush} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 flex items-center gap-1.5">
              <Radio size={12} />Push to Channels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
