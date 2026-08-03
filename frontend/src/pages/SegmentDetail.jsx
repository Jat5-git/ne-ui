import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip, StatusPill } from "@/components/Pills";
import { ArrowLeft, Search, Radio, Trash2, Edit3, RefreshCw, Layers } from "lucide-react";
import ListChannelDrawer from "@/components/ListChannelDrawer";
import EditProductModal from "@/components/EditProductModal";
import { toast } from "sonner";

const fmt = (n) => "₹" + (n || 0).toLocaleString("en-IN");

export default function SegmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { segments, products, listings, blockedForProduct, availableStock, removeProductFromSegment, deleteSegment, pushProductToChannels, revenueByChannel } = useStore();
  const segment = segments.find(s => s.id === id);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [listDrawer, setListDrawer] = useState(null);
  const [editProduct, setEditProduct] = useState(null);

  const segProducts = useMemo(() => (segment?.product_ids || []).map(pid => products.find(p => p.id === pid)).filter(Boolean), [segment, products]);
  const filtered = useMemo(() => segProducts.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    const avail = availableStock(p.id);
    if (stockFilter === "in_stock" && avail <= 0) return false;
    if (stockFilter === "low" && (avail === 0 || avail > 10)) return false;
    if (stockFilter === "out" && avail > 0) return false;
    if (q && !p.title.toLowerCase().includes(q.toLowerCase()) && !p.sku.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [segProducts, q, statusFilter, stockFilter, availableStock]);

  const toggleSelect = (pid) => setSelected(prev => { const n = new Set(prev); n.has(pid) ? n.delete(pid) : n.add(pid); return n; });

  if (!segment) return (<><Topbar title="Segment not found" /><div className="p-8"><Link to="/segments" className="text-[13px] text-[var(--primary)]">← Back to Segments</Link></div></>);

  const listedCount = segProducts.filter(p => p.status === "listed").length;
  const totalStock = segProducts.reduce((s, p) => s + p.stock, 0);
  const totalBlocked = segProducts.reduce((s, p) => s + blockedForProduct(p.id), 0);
  const totalAvailable = totalStock - totalBlocked;
  const uniqueChannels = Array.from(new Set(segProducts.flatMap(p => p.channels || [])));

  const bulkListNotYet = () => {
    const unlisted = segProducts.filter(p => (p.channels || []).length === 0);
    if (unlisted.length === 0) { toast.info("All products in this segment are listed on at least one channel"); return; }
    toast.success(`${unlisted.length} unlisted products ready`, { description: "Open the first one to publish across channels" });
    setListDrawer(unlisted[0]);
  };

  const bulkSync = () => {
    if (selected.size === 0) { toast.error("Select at least one product first"); return; }
    segProducts.filter(p => selected.has(p.id)).forEach(p => pushProductToChannels(p.id, p.channels || [], ["title", "price", "stock"]));
    toast.success(`Synced ${selected.size} products`, { description: "Latest master data pushed to all channels" });
    setSelected(new Set());
  };

  return (
    <>
      <Topbar
        breadcrumb={<Link to="/segments" className="hover:underline flex items-center gap-1"><ArrowLeft size={11} />Segments</Link>}
        title={<span className="flex items-center gap-2"><Layers size={16} className="text-[var(--primary)]" />{segment.name}</span>}
        subtitle={segment.description || <span className="text-[var(--fg-muted)]">{segment.product_ids.length} products · Created by {segment.created_by} · {segment.created_at}</span>}
        actions={
          <>
            <button data-testid="seg-bulk-sync" onClick={bulkSync} className="px-3 py-1.5 text-[12px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5"><RefreshCw size={12} />Sync Selected</button>
            <button data-testid="seg-bulk-list" onClick={bulkListNotYet} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white flex items-center gap-1.5"><Radio size={12} />List Unlisted</button>
            <button data-testid="seg-del-btn" onClick={() => { if (confirm(`Delete segment "${segment.name}"?`)) { deleteSegment(segment.id); navigate("/segments"); } }} className="px-3 py-1.5 text-[12px] border border-[var(--danger)] text-[var(--danger)] hover:bg-[#FDECEA] flex items-center gap-1.5"><Trash2 size={12} />Delete</button>
          </>
        }
      />
      <div className="px-8 py-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 border border-[var(--border)]">
          <div className="p-4 border-r border-[var(--border)]"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Products</div><div className="text-2xl font-display font-black tabular mt-1">{segProducts.length}</div></div>
          <div className="p-4 border-r border-[var(--border)]"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Listed</div><div className="text-2xl font-display font-black tabular mt-1">{listedCount}</div></div>
          <div className="p-4 border-r border-[var(--border)]"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Total Stock</div><div className="text-2xl font-display font-black tabular mt-1">{totalStock}</div></div>
          <div className="p-4 border-r border-[var(--border)]"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Blocked</div><div className="text-2xl font-display font-black tabular mt-1 text-[var(--warning)]">{totalBlocked}</div></div>
          <div className="p-4"><div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Available</div><div className={`text-2xl font-display font-black tabular mt-1 ${totalAvailable === 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{totalAvailable}</div></div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-[var(--border)] px-2.5 py-1.5 flex-1 max-w-md">
            <Search size={13} className="text-[var(--fg-muted)]" />
            <input data-testid="sd-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search this segment…" className="flex-1 text-[13px] outline-none bg-transparent" />
          </div>
          <select data-testid="sd-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-[var(--border)] px-2.5 py-1.5 text-[12px] bg-white">
            <option value="all">All statuses</option><option value="listed">Listed</option><option value="draft">Draft</option><option value="unlisted">Unlisted</option>
          </select>
          <select data-testid="sd-stock" value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="border border-[var(--border)] px-2.5 py-1.5 text-[12px] bg-white">
            <option value="all">All stock</option><option value="in_stock">In stock</option><option value="low">Low (≤10)</option><option value="out">Out of stock</option>
          </select>
          <div className="ml-auto text-[12px] text-[var(--fg-muted)] tabular">{filtered.length} products{uniqueChannels.length > 0 && <span> · {uniqueChannels.length} channels</span>}</div>
        </div>

        <div className="border border-[var(--border)] bg-white overflow-x-auto">
          <table className="w-full text-[13px]" data-testid="segment-products-table">
            <thead className="bg-[var(--surface)]">
              <tr className="border-b border-[var(--border)]">
                <th className="p-3 w-8"><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(p => p.id)) : new Set())} /></th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Product</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">SKU</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Stock</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Available</th>
                <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Status / Channels</th>
                <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium w-64">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const avail = availableStock(p.id);
                return (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-b-0 row-hover" data-testid={`sd-row-${p.id}`}>
                    <td className="p-3"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} data-testid={`sd-select-${p.id}`} /></td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={p.image} alt="" className="w-9 h-9 object-cover border border-[var(--border)]" />
                        <div><Link to={`/products/${p.id}`} className="font-medium hover:text-[var(--primary)] hover:underline">{p.title}</Link><div className="text-[11px] text-[var(--fg-muted)]">{p.brand}</div></div>
                      </div>
                    </td>
                    <td className="p-3 tabular text-[12px]">{p.sku}</td>
                    <td className="p-3 text-right tabular">{p.stock}</td>
                    <td className={`p-3 text-right tabular font-medium ${avail === 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{avail}</td>
                    <td className="p-3"><StatusPill status={p.status} />{p.channels && p.channels.length > 0 && <div className="flex gap-1 mt-1">{p.channels.map(ch => <ChannelChip key={ch} channel={ch} />)}</div>}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button data-testid={`sd-edit-${p.id}`} onClick={() => setEditProduct(p)} className="px-2 py-1 text-[11px] border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1"><Edit3 size={11} />Edit</button>
                        <button data-testid={`sd-list-${p.id}`} onClick={() => setListDrawer(p)} className="px-2 py-1 text-[11px] bg-[var(--primary)] text-white flex items-center gap-1"><Radio size={11} />List</button>
                        <button data-testid={`sd-rm-${p.id}`} onClick={() => { if (confirm(`Remove ${p.sku} from this segment?`)) removeProductFromSegment(segment.id, p.id); }} className="px-2 py-1 text-[11px] border border-[var(--border)] hover:bg-[#FDECEA] hover:text-[var(--danger)]"><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-[13px] text-[var(--fg-muted)]">{segProducts.length === 0 ? "This segment has no products yet." : "No products match filters."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {listDrawer && <ListChannelDrawer product={listDrawer} onClose={() => setListDrawer(null)} />}
      {editProduct && <EditProductModal product={editProduct} onClose={() => setEditProduct(null)} />}
    </>
  );
}
