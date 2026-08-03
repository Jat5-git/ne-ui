import React, { useState, useMemo } from "react";
import { Plus, X, ShieldCheck, AlertCircle, Trash2 } from "lucide-react";
import { getSchemaForCategory, CHANNEL_TABS } from "@/data/channelSchemas";
import { ChannelChip } from "./Pills";

// ---- Field renderer ----
function AttributeField({ field, value, onChange, error }) {
  const base = `w-full border px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--primary)] ${error ? "border-[var(--danger)] bg-[#FDECEA]" : "border-[var(--border)]"} ${field.type === "number" ? "tabular" : ""}`;

  const label = (
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-[11px] font-medium text-[var(--fg)]">
        {field.label}
        {field.required && <span className="text-[var(--danger)] ml-0.5">*</span>}
      </span>
      {field.maxLength && (
        <span className="text-[10px] text-[var(--fg-muted)] tabular">
          {(value?.length || 0)}/{field.maxLength}
        </span>
      )}
    </div>
  );

  return (
    <label className="block" data-testid={`attr-field-${field.key}`}>
      {label}
      {field.type === "select" ? (
        <select value={value ?? ""} onChange={e => onChange(e.target.value)} className={base + " bg-white"}>
          <option value="">— Select —</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.type === "multiselect" ? (
        <div className={`${base} bg-white flex flex-wrap gap-1 min-h-[36px] py-1.5 cursor-pointer`}>
          {field.options.map(o => {
            const arr = Array.isArray(value) ? value : [];
            const active = arr.includes(o);
            return (
              <button
                type="button"
                key={o}
                onClick={() => onChange(active ? arr.filter(x => x !== o) : [...arr, o])}
                className={`px-2 py-0.5 text-[10px] border ${active ? "bg-[var(--fg)] text-white border-[var(--fg)]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}
              >{o}</button>
            );
          })}
        </div>
      ) : field.type === "textarea" ? (
        <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} rows={3} maxLength={field.maxLength} className={base + " resize-y"} />
      ) : field.type === "checkbox" ? (
        <label className="flex items-center gap-2 cursor-pointer p-1.5 border border-[var(--border)] bg-white hover:bg-[var(--surface)]">
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
          <span className="text-[12px]">{value ? "Yes" : "No"}</span>
        </label>
      ) : field.type === "number" ? (
        <input type="number" value={value ?? ""} onChange={e => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))} className={base} />
      ) : (
        <input type="text" value={value ?? ""} onChange={e => onChange(e.target.value)} maxLength={field.maxLength} className={base} />
      )}
      {field.hint && !error && <span className="text-[10px] text-[var(--fg-muted)] mt-0.5 block">{field.hint}</span>}
      {error && <span className="text-[10px] text-[var(--danger)] mt-0.5 block">{error}</span>}
    </label>
  );
}

// ---- Add-custom-attribute inline form ----
function AddCustomAttribute({ onAdd, section }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");

  const create = () => {
    if (!label.trim()) return;
    const key = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    onAdd({ key: `custom_${section}_${key}`, label: label.trim(), type, custom: true });
    setLabel("");
    setType("text");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        data-testid={`add-attr-${section}`}
        onClick={() => setOpen(true)}
        className="col-span-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-[var(--border)] text-[12px] text-[var(--fg-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
      >
        <Plus size={12} />Add custom attribute
      </button>
    );
  }

  return (
    <div className="col-span-full border border-[var(--primary)] bg-[#F0F4FF] p-3 space-y-2" data-testid={`add-attr-form-${section}`}>
      <div className="text-[11px] font-medium">New custom attribute · {section}</div>
      <div className="flex gap-2">
        <input
          data-testid={`custom-label-${section}`}
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Attribute name (e.g., Fabric GSM, Battery Wh)"
          className="flex-1 border border-[var(--border)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--primary)]"
        />
        <select value={type} onChange={e => setType(e.target.value)} className="border border-[var(--border)] px-2 py-1.5 text-[12px] bg-white">
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="textarea">Long Text</option>
          <option value="checkbox">Yes/No</option>
        </select>
        <button data-testid={`custom-save-${section}`} onClick={create} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">Add</button>
        <button onClick={() => { setOpen(false); setLabel(""); }} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white">Cancel</button>
      </div>
    </div>
  );
}

// ---- Main editor ----
export default function ChannelAttributesEditor({ category, values = {}, onChange, customAttrs = {}, onCustomChange }) {
  const [tab, setTab] = useState("common");
  const schema = useMemo(() => getSchemaForCategory(category), [category]);

  const currentFields = (schema[tab] || []).concat(customAttrs[tab] || []);
  const required = currentFields.filter(f => f.required);
  const completed = required.filter(f => {
    const v = values[tab]?.[f.key];
    return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  });
  const completion = required.length === 0 ? 100 : Math.round((completed.length / required.length) * 100);

  const totalFields = CHANNEL_TABS.reduce((acc, t) => {
    const fs = (schema[t.key] || []).concat(customAttrs[t.key] || []);
    return acc + fs.filter(f => f.required).length;
  }, 0);
  const filledFields = CHANNEL_TABS.reduce((acc, t) => {
    const fs = (schema[t.key] || []).concat(customAttrs[t.key] || []);
    const filled = fs.filter(f => {
      const v = values[t.key]?.[f.key];
      return f.required && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
    }).length;
    return acc + filled;
  }, 0);

  const setField = (section, key, val) => {
    const nextSection = { ...(values[section] || {}), [key]: val };
    onChange({ ...values, [section]: nextSection });
  };

  const addCustom = (section, field) => {
    const nextCustom = { ...customAttrs, [section]: [...(customAttrs[section] || []), field] };
    onCustomChange(nextCustom);
  };

  const removeCustom = (section, key) => {
    const nextCustom = { ...customAttrs, [section]: (customAttrs[section] || []).filter(f => f.key !== key) };
    onCustomChange(nextCustom);
  };

  return (
    <div className="border border-[var(--border)]" data-testid="channel-attrs-editor">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Channel Attributes</div>
          <div className="font-display font-black text-[14px] tracking-tight mt-0.5">{schema.label}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Required Completion</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-32 h-1.5 bg-[var(--surface-2)] relative">
              <div className="absolute inset-y-0 left-0 bg-[var(--success)]" style={{ width: `${totalFields ? (filledFields / totalFields * 100) : 100}%` }}></div>
            </div>
            <span className="text-[11px] tabular font-medium">{filledFields}/{totalFields}</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-[var(--border)] overflow-x-auto">
        {CHANNEL_TABS.map(t => {
          const fs = (schema[t.key] || []).concat(customAttrs[t.key] || []);
          const reqCount = fs.filter(f => f.required).length;
          const doneCount = fs.filter(f => {
            const v = values[t.key]?.[f.key];
            return f.required && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
          }).length;
          const isDone = reqCount > 0 && reqCount === doneCount;
          return (
            <button
              key={t.key}
              data-testid={`schema-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-[12px] whitespace-nowrap border-b-2 flex items-center gap-2 transition-colors ${tab === t.key ? "border-[var(--primary)] text-[var(--fg)] font-medium bg-white" : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
            >
              {t.channel && <ChannelChip channel={t.channel} />}
              <span>{t.label}</span>
              {reqCount > 0 && (
                <span className={`text-[9px] tabular ${isDone ? "text-[var(--success)]" : "text-[var(--fg-muted)]"}`}>
                  {isDone ? <ShieldCheck size={10} className="inline" /> : `${doneCount}/${reqCount}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {currentFields.length === 0 ? (
          <div className="text-center py-8 text-[12px] text-[var(--fg-muted)]">
            <AlertCircle size={20} className="mx-auto mb-2 text-[var(--fg-muted)]" />
            No pre-defined attributes for this section. Add custom fields below.
            <div className="mt-4">
              <AddCustomAttribute onAdd={f => addCustom(tab, f)} section={tab} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentFields.map(field => (
              <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                {field.custom && (
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] uppercase tracking-widest text-[var(--primary)]">Custom</span>
                    <button
                      data-testid={`remove-custom-${field.key}`}
                      onClick={() => removeCustom(tab, field.key)}
                      className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--danger)] flex items-center gap-0.5"
                    >
                      <Trash2 size={9} />Remove
                    </button>
                  </div>
                )}
                <AttributeField
                  field={field}
                  value={values[tab]?.[field.key]}
                  onChange={val => setField(tab, field.key, val)}
                />
              </div>
            ))}
            <AddCustomAttribute onAdd={f => addCustom(tab, f)} section={tab} />
          </div>
        )}
      </div>
    </div>
  );
}
