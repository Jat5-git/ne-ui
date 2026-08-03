import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check, Search } from "lucide-react";

/**
 * SearchableSelect — reusable searchable single-select.
 * Props:
 *   value: current value (string) or "" if none
 *   onChange(v)
 *   options: Array<string | { value, label, group? }>
 *   placeholder
 *   testid
 *   size: "sm" | "md"
 *   className
 *   allowClear
 */
export default function SearchableSelect({ value, onChange, options, placeholder = "Select…", testid, size = "sm", className = "", allowClear = false, maxDisplay = 25 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    const handle = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => { if (!open) setQ(""); }, [open]);

  const normalized = options.map(o => (typeof o === "string" ? { value: o, label: o } : o));
  const matches = q ? normalized.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : normalized;
  const truncated = !q && matches.length > maxDisplay;
  const filtered = truncated ? matches.slice(0, maxDisplay) : matches;
  const selected = normalized.find(o => o.value === value);

  const height = size === "md" ? "py-2" : "py-1.5";
  const font = size === "md" ? "text-[13px]" : "text-[12px]";

  return (
    <div ref={rootRef} className={`relative ${className}`} data-testid={testid}>
      <button type="button" onClick={() => setOpen(o => !o)} className={`w-full flex items-center justify-between border border-[var(--border)] px-2.5 ${height} ${font} bg-white hover:border-[var(--fg-muted)] transition-colors`} data-testid={testid ? `${testid}-trigger` : undefined}>
        <span className={`truncate ${selected ? "" : "text-[var(--fg-muted)]"}`}>{selected ? selected.label : placeholder}</span>
        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selected && <span onClick={e => { e.stopPropagation(); onChange(""); }} className="p-0.5 hover:bg-[var(--surface)]"><X size={11} /></span>}
          <ChevronDown size={12} className={`text-[var(--fg-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-1 left-0 right-0 min-w-[220px] bg-white border border-[var(--border)] shadow-lg" data-testid={testid ? `${testid}-menu` : undefined}>
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-[var(--border)]">
            <Search size={11} className="text-[var(--fg-muted)]" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="flex-1 text-[12px] outline-none bg-transparent" data-testid={testid ? `${testid}-search` : undefined} />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map(o => (
              <button type="button" key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} className={`w-full text-left px-2.5 py-1.5 text-[12px] flex items-center gap-2 hover:bg-[var(--surface)] ${o.value === value ? "bg-[#F0F4FF]" : ""}`}>
                {o.value === value ? <Check size={11} className="text-[var(--primary)]" /> : <span className="w-[11px]" />}
                <span className="flex-1 truncate">{o.label}</span>
                {o.hint && <span className="text-[10px] text-[var(--fg-muted)] tabular">{o.hint}</span>}
              </button>
            ))}
            {truncated && <div className="px-3 py-2 text-[10px] text-[var(--fg-muted)] tabular border-t border-[var(--border)] bg-[var(--surface)]">Showing first {maxDisplay} of {matches.length}. Type to search all.</div>}
            {filtered.length === 0 && <div className="px-3 py-4 text-[12px] text-[var(--fg-muted)] text-center">No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}
