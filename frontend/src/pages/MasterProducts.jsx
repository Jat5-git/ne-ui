import React, { useState, useMemo } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill, SyncBadge } from "@/components/Pills";
import { Search, Upload, Plus, MoreHorizontal, Radio, Edit3, Eye, Layers, Boxes, Split, Lock } from "lucide-react";
import CsvImportWizard from "@/components/CsvImportWizard";
import ListChannelDrawer from "@/components/ListChannelDrawer";
import ProductListingsDrawer from "@/components/ProductListingsDrawer";
import VariantsDrawer from "@/components/VariantsDrawer";
import StockAllocationDrawer from "@/components/StockAllocationDrawer";
import NewProductModal from "@/components/NewProductModal";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function MasterProducts() {
  const { products, getVariants, blockedForProduct, availableStock } = useStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [listDrawerProduct, setListDrawerProduct] = useState(null);
  const [viewDrawerProduct, setViewDrawerProduct] = useState(null);
  const [variantsProduct, setVariantsProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (query && !p.title.toLowerCase().includes(query.toLowerCase()) && !p.sku.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [products, query, statusFilter]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const bulkList = () => {
    if (selected.size === 0) return;
    toast.success(`${selected.size} products queued for multi-channel listing`, { description: "Open Listings & Channels to review." });
    setSelected(new Set());
  };

  return (
    <>
      <Topbar
        title="Master Products"
        breadcrumb="Operations · Central Inventory"
        subtitle="Single source of truth for every SKU. All channels sync from here."
        actions={
          <>
            <button data-testid="btn-import-csv" onClick={() => setWizardOpen(true)} className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5 transition-colors">
              <Upload size={13} />Import via CSV
            </button>
            <button data-testid="btn-new-product" onClick={() => setNewProductOpen(true)} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5 transition-colors">
              <Plus size={13} />New Product
            </button>
          </>
        }
      />

      <div className="px-8 py-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-[var(--border)] px-2.5 py-1.5 flex-1 max-w-md">
            <Search size={13} className="text-[var(--fg-muted)]" />
            <input
              data-testid="products-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search title or SKU…"
              className="flex-1 text-[13px] outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center border border-[var(--border)] divide-x divide-[var(--border)]">
            {["all", "listed", "draft", "unlisted"].map(s => (
              <button
                key={s}
                data-testid={`filter-${s}`}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-[12px] capitalize transition-colors ${statusFilter === s ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="ml-auto text-[12px] text-[var(--fg-muted)] tabular">{filtered.length} products</div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center justify-between border border-[var(--primary)] bg-[#F0F4FF] px-4 py-2.5" data-testid="bulk-bar">
            <span className="text-[13px] font-medium">{selected.size} selected</span>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set())} className="px-3 py-1 text-[12px] border border-[var(--border)] bg-white hover:bg-[var(--surface)]">Clear</button>
              <button data-testid="bulk-list" onClick={bulkList} className="px-3 py-1 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">List on Channels</button>
            </div>
          </div>
        )}

        <div className="border border-[var(--border)] bg-white overflow-x-auto">
          <table className="w-full text-[13px]" data-testid="products-table">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                <th className="p-3 text-left w-8"><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(p => p.id)) : new Set())} /></th>
                <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Product</th>
                <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Master SKU</th>
                <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Category</th>
                <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">MRP</th>
                <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Stock</th>
                <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Blocked</th>
                <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Available</th>
                <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Variants</th>
                <th className="p-3 text-left font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">Sync Status</th>
                <th className="p-3 text-right font-medium text-[11px] uppercase tracking-wider text-[var(--fg-muted)] w-64">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const vs = getVariants(p.id);
                const vStock = vs.reduce((s, v) => s + v.stock, 0);
                const displayStock = p.stock;  // master pool always primary
                const blocked = blockedForProduct(p.id);
                const available = availableStock(p.id);
                return (
                <tr key={p.id} className="row-hover border-b border-[var(--border)] last:border-b-0" data-testid={`product-row-${p.id}`}>
                  <td className="p-3"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} data-testid={`select-${p.id}`} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={p.image} alt="" className="w-9 h-9 object-cover border border-[var(--border)]" />
                        {(p.images || []).length >= 1 && (
                          <span data-testid={`mp-img-badge-${p.id}`} className="absolute -top-1 -right-1 bg-[var(--fg)] text-white text-[9px] px-1 py-0 tabular font-medium" title={`${(p.images || []).length} image${(p.images || []).length !== 1 ? "s" : ""}`}>{(p.images || []).length}</span>
                        )}
                      </div>
                      <div>
                        <Link to={`/products/${p.id}`} data-testid={`product-link-${p.id}`} className="font-medium hover:text-[var(--primary)] hover:underline transition-colors">{p.title}</Link>
                        <div className="text-[11px] text-[var(--fg-muted)]">{p.brand} · updated {p.updated}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 tabular text-[12px]">{p.sku}</td>
                  <td className="p-3 text-[12px]">{p.category}</td>
                  <td className="p-3 text-right tabular">₹{p.mrp.toLocaleString("en-IN")}</td>
                  <td className={`p-3 text-right tabular font-medium ${displayStock === 0 ? "text-[var(--danger)]" : ""}`}>
                    <button data-testid={`stock-btn-${p.id}`} onClick={() => setStockProduct(p)} className="inline-flex flex-col items-end gap-0.5 hover:text-[var(--primary)] group transition-colors" title={p.stock_mode === "central" ? "Central Pool: all channels share this master stock" : "Allocated per Channel: each channel has a dedicated bucket"}>
                      <span className="flex items-center gap-1.5">
                        <span>{displayStock}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 border text-[9px] uppercase tracking-widest font-medium ${p.stock_mode === "central" ? "border-[var(--border)] text-[var(--fg-muted)] group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]" : "border-[var(--primary)] text-[var(--primary)] bg-[#F0F4FF]"}`}>
                          {p.stock_mode === "central" ? <Boxes size={9} className="mr-0.5" /> : <Split size={9} className="mr-0.5" />}
                          {p.stock_mode === "central" ? "Pool" : "Split"}
                        </span>
                      </span>
                      {vs.length > 0 && (
                        <span className="text-[10px] text-[var(--fg-muted)] font-normal tabular">{vStock} in variants</span>
                      )}
                    </button>
                  </td>
                  <td className="p-3 text-right tabular" data-testid={`blocked-${p.id}`}>
                    {blocked > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-[var(--warning)] text-[var(--warning)] bg-[#FFF7E6] text-[11px] font-medium" title="Units reserved by open orders (placed/processing/shipped)">
                        <Lock size={9} />{blocked}
                      </span>
                    ) : <span className="text-[var(--fg-muted)] text-[11px]">—</span>}
                  </td>
                  <td className={`p-3 text-right tabular font-medium ${available === 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`} data-testid={`available-${p.id}`} title="On-hand stock − blocked">
                    {available}
                  </td>
                  <td className="p-3">
                    {vs.length > 0 ? (
                      <button data-testid={`open-variants-${p.id}`} onClick={() => setVariantsProduct(p)} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                        <Layers size={11} />
                        <span className="tabular font-medium">{vs.length}</span>
                        <span className="text-[var(--fg-muted)]">·</span>
                        <span className="text-[var(--fg-muted)]">{(p.option_axes || []).map(a => a.name).join(" × ")}</span>
                      </button>
                    ) : (
                      <button data-testid={`open-variants-${p.id}`} onClick={() => setVariantsProduct(p)} className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--primary)] flex items-center gap-1 transition-colors">
                        <Plus size={10} />Add variants
                      </button>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <StatusPill status={p.status} />
                      {p.channels.length > 0 && <SyncBadge count={p.channels.length} />}
                    </div>
                    {p.channels.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {p.channels.map(ch => <ChannelChip key={ch} channel={ch} />)}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="row-actions flex items-center gap-1 justify-end">
                      <button data-testid={`variants-${p.id}`} onClick={() => setVariantsProduct(p)} className="px-2 py-1 text-[11px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1 transition-colors">
                        <Layers size={11} />Variants
                      </button>
                      <button data-testid={`view-listings-${p.id}`} onClick={() => setViewDrawerProduct(p)} className="px-2 py-1 text-[11px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1 transition-colors">
                        <Eye size={11} />View
                      </button>
                      <button data-testid={`list-channel-${p.id}`} onClick={() => setListDrawerProduct(p)} className="px-2 py-1 text-[11px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1 transition-colors">
                        <Radio size={11} />List
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="p-12 text-center text-[13px] text-[var(--fg-muted)]">No products match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {wizardOpen && <CsvImportWizard onClose={() => setWizardOpen(false)} />}
      {listDrawerProduct && <ListChannelDrawer product={listDrawerProduct} onClose={() => setListDrawerProduct(null)} />}
      {viewDrawerProduct && <ProductListingsDrawer product={viewDrawerProduct} onClose={() => setViewDrawerProduct(null)} />}
      {variantsProduct && <VariantsDrawer product={variantsProduct} onClose={() => setVariantsProduct(null)} />}
      {stockProduct && <StockAllocationDrawer product={stockProduct} onClose={() => setStockProduct(null)} />}
      {newProductOpen && <NewProductModal onClose={() => setNewProductOpen(false)} />}
    </>
  );
}
