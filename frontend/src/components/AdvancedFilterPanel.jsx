import React, { useMemo } from "react";
import SearchableSelect from "./SearchableSelect";
import { Plus, X, SlidersHorizontal, ChevronDown } from "lucide-react";

// Reusable advanced filter panel for Analytics, Listings, Master Products, Segments.
// Props:
//   fields:   [{ key, label, type: "string"|"number"|"date" }]
//   filters:  [{ id, field, operator, value, valueEnd }]
//   match:    "all" | "any"
//   setFilters, setMatch
//   open, setOpen
//   testidPrefix (default "adv")
//   defaultOpen (whether the panel starts expanded)
// Also exports a pure `applyFilters(rows, filters, match, fieldsByKey)` helper.

const OPS = {
  number: [{ v: "eq", l: "equals" }, { v: "neq", l: "not equals" }, { v: "gt", l: "greater than" }, { v: "gte", l: "≥" }, { v: "lt", l: "less than" }, { v: "lte", l: "≤" }, { v: "between", l: "between" }, { v: "empty", l: "is empty" }, { v: "notempty", l: "is not empty" }],
  date:   [{ v: "on_or_after", l: "on or after" }, { v: "on_or_before", l: "on or before" }, { v: "between", l: "between" }, { v: "in_last_days", l: "in last N days" }, { v: "empty", l: "is empty" }, { v: "notempty", l: "is not empty" }],
  string: [{ v: "contains", l: "contains" }, { v: "not_contains", l: "does not contain" }, { v: "eq", l: "equals" }, { v: "neq", l: "not equals" }, { v: "starts", l: "starts with" }, { v: "ends", l: "ends with" }, { v: "empty", l: "is empty" }, { v: "notempty", l: "is not empty" }],
};

export function opsFor(type) { return OPS[type] || OPS.string; }

export function evalRule(row, f, fieldMap) {
  const col = fieldMap[f.field]; const type = col?.type || "string";
  const raw = row[f.field];
  const v = raw === null || raw === undefined ? "" : raw;
  const q = f.value, q2 = f.valueEnd;
  switch (f.operator) {
    case "empty":    return v === "" || v === null || v === undefined;
    case "notempty": return !(v === "" || v === null || v === undefined);
    case "eq":       return type === "number" ? Number(v) === Number(q) : String(v).toLowerCase() === String(q).toLowerCase();
    case "neq":      return type === "number" ? Number(v) !== Number(q) : String(v).toLowerCase() !== String(q).toLowerCase();
    case "contains":     return String(v).toLowerCase().includes(String(q).toLowerCase());
    case "not_contains": return !String(v).toLowerCase().includes(String(q).toLowerCase());
    case "starts":       return String(v).toLowerCase().startsWith(String(q).toLowerCase());
    case "ends":         return String(v).toLowerCase().endsWith(String(q).toLowerCase());
    case "gt":  return Number(v) >  Number(q);
    case "gte": return Number(v) >= Number(q);
    case "lt":  return Number(v) <  Number(q);
    case "lte": return Number(v) <= Number(q);
    case "between":
      if (type === "date") return String(v) >= String(q) && String(v) <= String(q2);
      return Number(v) >= Number(q) && Number(v) <= Number(q2);
    case "on_or_after":  return String(v) >= String(q);
    case "on_or_before": return String(v) <= String(q);
    case "in_last_days": {
      const days = Number(q); if (!days) return true;
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
      try { return new Date(v) >= cutoff; } catch { return false; }
    }
    default: return true;
  }
}

export function applyFilters(rows, filters, match, fieldMap) {
  if (!filters || filters.length === 0) return rows;
  return rows.filter(row => match === "any" ? filters.some(f => evalRule(row, f, fieldMap)) : filters.every(f => evalRule(row, f, fieldMap)));
}

export default function AdvancedFilterPanel({ fields, filters, setFilters, match, setMatch, open, setOpen, testidPrefix = "adv" }) {
  const fieldMap = useMemo(() => Object.fromEntries(fields.map(f => [f.key, f])), [fields]);
  const fieldOptions = useMemo(() => fields.map(f => ({ value: f.key, label: f.label })), [fields]);

  const addFilter = () => {
    const first = fields[0]; if (!first) return;
    setFilters([...filters, { id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, field: first.key, operator: opsFor(first.type)[0].v, value: "", valueEnd: "" }]);
  };
  const removeFilter = (id) => setFilters(filters.filter(f => f.id !== id));
  const updateFilter = (id, patch) => setFilters(filters.map(f => f.id === id ? { ...f, ...patch } : f));
  const clearAll = () => setFilters([]);

  return (
    <div className="border border-[var(--primary)] bg-white" data-testid={`${testidPrefix}-container`}>
      <button onClick={() => setOpen(!open)} data-testid={`${testidPrefix}-toggle`} className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-medium hover:bg-[var(--surface)] transition-colors ${filters.length > 0 ? "bg-[#F0F4FF]" : ""}`}>
        <span className="flex items-center gap-2"><SlidersHorizontal size={14} className="text-[var(--primary)]" /><span className="font-display font-black tracking-tight">Advanced Filters</span>{filters.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-[var(--primary)] text-white text-[10px] tabular font-bold">{filters.length}</span>}</span>
        <span className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
          {filters.length > 0 && <span>Match: <b className="uppercase">{match === "all" ? "ALL (AND)" : "ANY (OR)"}</b></span>}
          <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="p-4 border-t border-[var(--border)] space-y-3" data-testid={`${testidPrefix}-panel`}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Match</span>
            <div className="flex border border-[var(--border)] divide-x divide-[var(--border)]">
              <button data-testid={`${testidPrefix}-match-all`} onClick={() => setMatch("all")} className={`px-2.5 py-1 text-[11px] ${match === "all" ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}>ALL (AND)</button>
              <button data-testid={`${testidPrefix}-match-any`} onClick={() => setMatch("any")} className={`px-2.5 py-1 text-[11px] ${match === "any" ? "bg-[var(--fg)] text-white" : "hover:bg-[var(--surface)]"}`}>ANY (OR)</button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {filters.length > 0 && <button onClick={clearAll} data-testid={`${testidPrefix}-clear`} className="px-2.5 py-1 text-[11px] border border-[var(--border)] hover:bg-[var(--surface)]">Clear all</button>}
              <button onClick={addFilter} data-testid={`${testidPrefix}-add`} className="px-2.5 py-1 text-[11px] bg-[var(--primary)] text-white flex items-center gap-1 font-medium"><Plus size={11} />Add filter</button>
            </div>
          </div>
          <div className="space-y-2">
            {filters.map((f, i) => {
              const col = fieldMap[f.field] || fields[0];
              const type = col.type;
              const ops = opsFor(type);
              const needsValue = !["empty", "notempty"].includes(f.operator);
              const needsRangeEnd = f.operator === "between";
              const isNumber = type === "number" && !needsRangeEnd && f.operator !== "in_last_days";
              const isDateInput = type === "date" && !["in_last_days", "empty", "notempty"].includes(f.operator);
              return (
                <div key={f.id} className="flex items-center gap-2 flex-wrap border border-[var(--border)] p-2.5 bg-[var(--surface)]" data-testid={`${testidPrefix}-row-${i}`}>
                  <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold w-12">{i === 0 ? "Where" : match.toUpperCase()}</span>
                  <SearchableSelect value={f.field} onChange={(v) => { const nc = fieldMap[v]; updateFilter(f.id, { field: v, operator: opsFor(nc?.type || "string")[0].v, value: "", valueEnd: "" }); }} options={fieldOptions} testid={`${testidPrefix}-field-${i}`} className="min-w-[170px]" />
                  <SearchableSelect value={f.operator} onChange={(v) => updateFilter(f.id, { operator: v, value: "", valueEnd: "" })} options={ops.map(o => ({ value: o.v, label: o.l }))} testid={`${testidPrefix}-op-${i}`} className="min-w-[150px]" />
                  {needsValue && (
                    f.operator === "in_last_days" ? (
                      <input type="number" min="1" value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })} placeholder="N days" className="w-24 border border-[var(--border)] px-2 py-1.5 text-[12px] tabular bg-white" data-testid={`${testidPrefix}-val-${i}`} />
                    ) : isDateInput ? (
                      <input type="date" value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })} className="border border-[var(--border)] px-2 py-1.5 text-[12px] tabular bg-white" data-testid={`${testidPrefix}-val-${i}`} />
                    ) : isNumber ? (
                      <input type="number" value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })} placeholder="value" className="w-28 border border-[var(--border)] px-2 py-1.5 text-[12px] tabular bg-white" data-testid={`${testidPrefix}-val-${i}`} />
                    ) : (
                      <input value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })} placeholder="value" className="min-w-[140px] border border-[var(--border)] px-2 py-1.5 text-[12px] bg-white" data-testid={`${testidPrefix}-val-${i}`} />
                    )
                  )}
                  {needsRangeEnd && (
                    <>
                      <span className="text-[11px] text-[var(--fg-muted)]">and</span>
                      {type === "date"
                        ? <input type="date" value={f.valueEnd} onChange={e => updateFilter(f.id, { valueEnd: e.target.value })} className="border border-[var(--border)] px-2 py-1.5 text-[12px] tabular bg-white" data-testid={`${testidPrefix}-valend-${i}`} />
                        : <input type="number" value={f.valueEnd} onChange={e => updateFilter(f.id, { valueEnd: e.target.value })} className="w-28 border border-[var(--border)] px-2 py-1.5 text-[12px] tabular bg-white" data-testid={`${testidPrefix}-valend-${i}`} />
                      }
                    </>
                  )}
                  <button onClick={() => removeFilter(f.id)} data-testid={`${testidPrefix}-rm-${i}`} className="ml-auto p-1.5 hover:bg-white text-[var(--fg-muted)] hover:text-[var(--danger)]"><X size={13} /></button>
                </div>
              );
            })}
            {filters.length === 0 && (
              <div className="border border-dashed border-[var(--border)] p-4 text-center text-[12px] text-[var(--fg-muted)]">
                No advanced filters yet — click <b>+ Add filter</b> above.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
