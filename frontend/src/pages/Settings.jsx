import React, { useState } from "react";
import Topbar from "@/components/Topbar";
import { useStore } from "@/store/StoreContext";
import { ChannelChip } from "@/components/Pills";
import { Plus, Trash2, Edit3, Check, X, Search, Sliders, Sparkles } from "lucide-react";
import { toast } from "sonner";

const CHANNEL_OPTIONS = [
  { key: "global",      label: "Global (all)" },
  { key: "amazon",      label: "Amazon" },
  { key: "flipkart",    label: "Flipkart" },
  { key: "shopify",     label: "Shopify" },
  { key: "woocommerce", label: "WooCommerce" },
];
const TYPES = ["text", "textarea", "number", "select", "multiselect", "checkbox"];

const emptyAttr = { key: "", label: "", type: "text", options: [], channels: ["global"], required: false, hint: "" };

export default function Settings() {
  const { attributes, addAttribute, updateAttribute, deleteAttribute } = useStore();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyAttr);

  const filtered = attributes.filter(a => !q || a.label.toLowerCase().includes(q.toLowerCase()) || a.key.toLowerCase().includes(q.toLowerCase()));

  const startCreate = () => { setCreating(true); setDraft(emptyAttr); setEditingId(null); };
  const startEdit = (a) => { setEditingId(a.id); setDraft(a); setCreating(false); };
  const cancel = () => { setCreating(false); setEditingId(null); setDraft(emptyAttr); };

  const save = () => {
    if (!draft.label.trim()) return toast.error("Label is required");
    if (!draft.key.trim()) draft.key = draft.label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    if (draft.channels.length === 0) return toast.error("Pick at least one channel");
    if ((draft.type === "select" || draft.type === "multiselect") && draft.options.length === 0)
      return toast.error("Add at least one option for select/multiselect");

    if (creating) {
      addAttribute(draft);
      toast.success(`Attribute "${draft.label}" added — now available in New Product & CSV import`);
    } else {
      updateAttribute(editingId, draft);
      toast.success(`Attribute "${draft.label}" updated`);
    }
    cancel();
  };

  const del = (a) => {
    if (a.system) return toast.error("System attributes cannot be deleted, only edited");
    if (!window.confirm(`Delete "${a.label}"? This attribute will disappear from all product forms.`)) return;
    deleteAttribute(a.id);
    toast.info(`"${a.label}" removed`);
  };

  const toggleChannel = (key) => {
    setDraft(d => {
      // Global is exclusive — picking Global clears channel-specific picks; picking a channel clears Global.
      let next;
      if (key === "global") {
        next = d.channels.includes("global") ? d.channels.filter(k => k !== "global") : ["global"];
      } else {
        const withoutGlobal = d.channels.filter(k => k !== "global");
        next = withoutGlobal.includes(key) ? withoutGlobal.filter(k => k !== key) : [...withoutGlobal, key];
      }
      return { ...d, channels: next };
    });
  };

  const isEditing = creating || !!editingId;

  return (
    <>
      <Topbar
        breadcrumb="Settings · Global"
        title="Attribute Management"
        subtitle="Central schema library. Any attribute defined here appears in New Product forms, CSV import mapping, and Product Detail everywhere."
        actions={
          <button data-testid="new-attr-btn" onClick={startCreate} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5 transition-colors">
            <Plus size={12} />New Attribute
          </button>
        }
      />

      <div className="border-b border-[var(--border)] px-8">
        <div className="flex gap-6">
          <div className="py-3 text-[13px] border-b-2 border-[var(--primary)] text-[var(--fg)] font-medium flex items-center gap-1.5">
            <Sliders size={13} />Attribute Management
          </div>
        </div>
      </div>

      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border border-[var(--border)] px-2.5 py-1.5 max-w-md">
            <Search size={13} className="text-[var(--fg-muted)]" />
            <input data-testid="attr-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search attributes…" className="flex-1 text-[13px] outline-none bg-transparent" />
            <span className="text-[11px] text-[var(--fg-muted)] tabular">{filtered.length} of {attributes.length}</span>
          </div>

          <div className="border border-[var(--border)] bg-white overflow-x-auto">
            <table className="w-full text-[13px]" data-testid="attributes-table">
              <thead className="bg-[var(--surface)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Attribute</th>
                  <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Type</th>
                  <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Channels</th>
                  <th className="p-3 text-left text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Required</th>
                  <th className="p-3 text-right text-[11px] uppercase tracking-wider text-[var(--fg-muted)] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)]" data-testid={`attr-row-${a.id}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium flex items-center gap-1.5">{a.label} {a.system && <Sparkles size={10} className="text-[var(--primary)]" />}</div>
                          <div className="text-[10px] text-[var(--fg-muted)] tabular">{a.key}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-[12px]"><span className="chip">{a.type}</span></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {a.channels.includes("global")
                          ? <span className="chip">Global · all</span>
                          : a.channels.map(c => <ChannelChip key={c} channel={c} />)
                        }
                      </div>
                    </td>
                    <td className="p-3">
                      {a.required
                        ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-[var(--danger)] text-[var(--danger)] text-[10px] uppercase tracking-widest font-medium">Required</span>
                        : <span className="text-[11px] text-[var(--fg-muted)]">Optional</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button data-testid={`attr-edit-${a.id}`} onClick={() => startEdit(a)} className="p-1 hover:bg-white border border-[var(--border)]"><Edit3 size={11} /></button>
                        <button data-testid={`attr-del-${a.id}`} onClick={() => del(a)} disabled={a.system} className={`p-1 border border-[var(--border)] ${a.system ? "opacity-40 cursor-not-allowed" : "hover:bg-[#FDECEA] hover:text-[var(--danger)]"}`}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side: create / edit form */}
        <div className="border border-[var(--border)] bg-white p-5 h-fit sticky top-24" data-testid="attr-editor-panel">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">{isEditing ? (creating ? "Create Attribute" : "Edit Attribute") : "Attribute Editor"}</div>
              <div className="font-display font-black text-[15px] tracking-tight mt-0.5">
                {isEditing ? (draft.label || "New attribute") : "Select or create an attribute"}
              </div>
            </div>
            {isEditing && <button onClick={cancel} className="p-1 hover:bg-[var(--surface)]"><X size={13} /></button>}
          </div>

          {!isEditing && (
            <div className="text-[12px] text-[var(--fg-muted)] py-6 text-center">
              Choose an attribute from the list to edit, or click <b>New Attribute</b> to add one.<br />
              <span className="text-[11px] mt-2 block">New attributes automatically appear in the product form and CSV import.</span>
            </div>
          )}

          {isEditing && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-medium text-[var(--fg-muted)]">Label <span className="text-[var(--danger)]">*</span></span>
                <input data-testid="draft-label" value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} placeholder="e.g., Battery Wh" className="mt-1 w-full border border-[var(--border)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--primary)]" />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-[var(--fg-muted)]">Key (technical ID)</span>
                <input data-testid="draft-key" value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value })} placeholder="auto-generated" className="mt-1 w-full border border-[var(--border)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--primary)] tabular text-[12px]" />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-[var(--fg-muted)]">Type</span>
                <select data-testid="draft-type" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} className="mt-1 w-full border border-[var(--border)] px-2.5 py-1.5 text-[13px] outline-none bg-white">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              {(draft.type === "select" || draft.type === "multiselect") && (
                <label className="block">
                  <span className="text-[11px] font-medium text-[var(--fg-muted)]">Options (comma-separated)</span>
                  <input data-testid="draft-options" value={draft.options.join(", ")} onChange={e => setDraft({ ...draft, options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="Red, Green, Blue" className="mt-1 w-full border border-[var(--border)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--primary)]" />
                </label>
              )}
              <label className="block">
                <span className="text-[11px] font-medium text-[var(--fg-muted)]">Hint / Help text</span>
                <input value={draft.hint} onChange={e => setDraft({ ...draft, hint: e.target.value })} placeholder="Shown below the field" className="mt-1 w-full border border-[var(--border)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--primary)]" />
              </label>

              <div>
                <div className="text-[11px] font-medium text-[var(--fg-muted)] mb-1.5">Visible on channels</div>
                <div className="flex flex-wrap gap-1.5">
                  {CHANNEL_OPTIONS.map(c => {
                    const active = draft.channels.includes(c.key);
                    return (
                      <button
                        type="button"
                        key={c.key}
                        data-testid={`draft-ch-${c.key}`}
                        onClick={() => toggleChannel(c.key)}
                        className={`px-2.5 py-1 text-[11px] border transition-colors ${active ? "bg-[var(--fg)] text-white border-[var(--fg)]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}
                      >{c.label}</button>
                    );
                  })}
                </div>
                {draft.channels.includes("global") && draft.channels.length > 1 && (
                  <div className="text-[10px] text-[var(--warning)] mt-1">Global overrides individual channel picks.</div>
                )}
              </div>

              <label className="flex items-center gap-2 py-2 border-t border-[var(--border)] mt-3 cursor-pointer">
                <input type="checkbox" data-testid="draft-required" checked={draft.required} onChange={e => setDraft({ ...draft, required: e.target.checked })} />
                <span className="text-[13px]">Required — block product save until filled</span>
              </label>

              <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                <button onClick={cancel} className="flex-1 px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white">Cancel</button>
                <button data-testid="draft-save" onClick={save} className="flex-1 px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-1.5">
                  <Check size={12} />{creating ? "Create" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
