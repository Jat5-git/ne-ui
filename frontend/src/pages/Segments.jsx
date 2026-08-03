import React, { useState, useMemo } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { Search, Plus, Layers, Trash2, Package, Radio } from "lucide-react";
import { Link } from "react-router-dom";

export default function Segments() {
  const { segments, products, deleteSegment } = useStore();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => segments.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || (s.description || "").toLowerCase().includes(q.toLowerCase())), [segments, q]);

  return (
    <>
      <Topbar title="Segments" breadcrumb="Operations · Custom Collections" subtitle="Group products from your master inventory into custom, actionable buckets." />
      <div className="px-8 py-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-[var(--border)] px-2.5 py-1.5 flex-1 max-w-md">
            <Search size={13} className="text-[var(--fg-muted)]" />
            <input data-testid="seg-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search segments…" className="flex-1 text-[13px] outline-none bg-transparent" />
          </div>
          <Link to="/products" data-testid="seg-goto-products" className="ml-auto px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5"><Plus size={13} />Select from Master Products</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="segments-grid">
          {filtered.map(s => {
            const prods = (s.product_ids || []).map(pid => products.find(p => p.id === pid)).filter(Boolean);
            const listed = prods.filter(p => p.status === "listed").length;
            const revenue = 0; // Placeholder aggregation
            return (
              <Link key={s.id} to={`/segments/${s.id}`} data-testid={`seg-card-${s.id}`} className="border border-[var(--border)] bg-white p-5 hover:border-[var(--primary)] transition-colors group flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-[var(--primary)]" />
                    <div className="font-display font-black text-base tracking-tight group-hover:text-[var(--primary)]">{s.name}</div>
                  </div>
                  <button onClick={e => { e.preventDefault(); if (confirm(`Delete segment "${s.name}"?`)) deleteSegment(s.id); }} data-testid={`seg-del-${s.id}`} className="p-1 hover:bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--danger)]"><Trash2 size={12} /></button>
                </div>
                {s.description && <div className="text-[12px] text-[var(--fg-muted)] mb-3 line-clamp-2">{s.description}</div>}
                <div className="grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3 text-[11px]">
                  <div><div className="text-[9px] uppercase tracking-widest text-[var(--fg-muted)]">Products</div><div className="tabular font-black text-base mt-0.5">{prods.length}</div></div>
                  <div><div className="text-[9px] uppercase tracking-widest text-[var(--fg-muted)]">Listed</div><div className="tabular font-black text-base mt-0.5">{listed}</div></div>
                  <div><div className="text-[9px] uppercase tracking-widest text-[var(--fg-muted)]">Draft</div><div className="tabular font-black text-base mt-0.5">{prods.length - listed}</div></div>
                </div>
                <div className="flex gap-1 mt-3">
                  {prods.slice(0, 5).map(p => <img key={p.id} src={p.image} alt="" className="w-8 h-8 object-cover border border-[var(--border)]" />)}
                  {prods.length > 5 && <div className="w-8 h-8 border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[10px] tabular text-[var(--fg-muted)]">+{prods.length - 5}</div>}
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--fg-muted)]">
                  <span className="tabular">{s.created_at}</span>
                  <span>{s.created_by}</span>
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full border border-dashed border-[var(--border)] p-12 text-center text-[13px] text-[var(--fg-muted)]">
              {segments.length === 0 ? "No segments yet. Select products from Master Products and create your first segment." : "No segments match your search."}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
