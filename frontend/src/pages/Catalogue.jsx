import React, { useState } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { FolderTree, Layers, Palette, ChevronRight } from "lucide-react";

const TABS = [
  { key: "categories", label: "Category Taxonomies", icon: FolderTree },
  { key: "schemas", label: "Attribute Schemas", icon: Layers },
  { key: "brands", label: "Brand & Media", icon: Palette },
];

export default function Catalogue() {
  const { categories, schemas, brands } = useStore();
  const [tab, setTab] = useState("categories");
  const [selectedCat, setSelectedCat] = useState(categories[0]?.id);

  const currentCat = categories.find(c => c.id === selectedCat);
  const children = categories.filter(c => c.parent === selectedCat);

  return (
    <>
      <Topbar
        title="Catalogue"
        breadcrumb="Setup & Assets · Pre-Master Templates"
        subtitle="Reusable schemas that auto-fill your Master Products — eliminate repetitive data entry."
      />

      <div className="border-b border-[var(--border)] px-8">
        <div className="flex gap-6">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} data-testid={`cat-tab-${t.key}`} onClick={() => setTab(t.key)} className={`py-3 text-[13px] border-b-2 flex items-center gap-1.5 transition-colors ${tab === t.key ? "border-[var(--primary)] text-[var(--fg)] font-medium" : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}>
                <Icon size={13} />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-8">
        {tab === "categories" && (
          <div className="grid grid-cols-1 lg:grid-cols-[30%_1fr] gap-6">
            <div className="border border-[var(--border)] bg-white">
              <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] text-[10px] uppercase tracking-widest font-semibold text-[var(--fg-muted)]">Taxonomy Tree</div>
              <div className="divide-y divide-[var(--border)]">
                {categories.filter(c => !c.parent).map(root => (
                  <div key={root.id}>
                    <button data-testid={`cat-${root.id}`} onClick={() => setSelectedCat(root.id)} className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] hover:bg-[var(--surface)] ${selectedCat === root.id ? "bg-[#F0F4FF] text-[var(--primary)] font-medium" : ""}`}>
                      <span className="flex items-center gap-2"><FolderTree size={12} />{root.name}</span>
                      <span className="tabular text-[11px] text-[var(--fg-muted)]">{root.count}</span>
                    </button>
                    {categories.filter(c => c.parent === root.id).map(child => (
                      <button key={child.id} data-testid={`cat-${child.id}`} onClick={() => setSelectedCat(child.id)} className={`w-full flex items-center justify-between pl-10 pr-4 py-2 text-[12px] hover:bg-[var(--surface)] ${selectedCat === child.id ? "bg-[#F0F4FF] text-[var(--primary)] font-medium" : "text-[var(--fg-muted)]"}`}>
                        <span className="flex items-center gap-1.5"><ChevronRight size={10} />{child.name}</span>
                        <span className="tabular text-[11px]">{child.count}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[var(--border)] bg-white p-6">
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Category Details</div>
              <div className="font-display text-2xl font-black tracking-tight mt-1">{currentCat?.name}</div>
              <div className="text-[12px] text-[var(--fg-muted)] mt-1">{currentCat?.count} products · Parent: {currentCat?.parent ? categories.find(c => c.id === currentCat.parent)?.name : "—"}</div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="border border-[var(--border)] p-4">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Amazon Category ID</div>
                  <div className="tabular text-[14px] font-medium mt-1">{currentCat?.amazon_id}</div>
                </div>
                <div className="border border-[var(--border)] p-4">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Shopify Product Type</div>
                  <div className="text-[14px] font-medium mt-1">{currentCat?.shopify_type}</div>
                </div>
              </div>

              {children.length > 0 && (
                <div className="mt-6">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold mb-2">Subcategories</div>
                  <div className="flex flex-wrap gap-2">
                    {children.map(ch => <span key={ch.id} className="chip">{ch.name} · {ch.count}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "schemas" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {schemas.map(s => (
              <div key={s.id} className="border border-[var(--border)] p-5 bg-white hover:shadow-sm transition-shadow" data-testid={`schema-${s.id}`}>
                <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Attribute Schema</div>
                <div className="font-display text-lg font-black tracking-tight mt-1">{s.name}</div>
                <div className="text-[11px] text-[var(--fg-muted)] mt-1">Used by {s.used_by} products · {s.categories.join(", ")}</div>
                <div className="mt-4 space-y-1.5">
                  {s.fields.map(f => (
                    <div key={f} className="flex items-center gap-2 text-[12px] py-1 border-b border-[var(--border)] last:border-b-0">
                      <span className="w-1 h-1 bg-[var(--fg-muted)]"></span>{f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "brands" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {brands.map(b => (
              <div key={b.id} className="border border-[var(--border)] p-5 bg-white" data-testid={`brand-${b.id}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center text-white font-display font-black" style={{ background: b.primary_color }}>{b.name.charAt(0)}</div>
                  <div>
                    <div className="font-display text-base font-black tracking-tight">{b.name}</div>
                    <div className="text-[11px] text-[var(--fg-muted)] tabular">{b.assets} media assets</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-[var(--surface)] border border-[var(--border)]"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
