import React, { useState, useRef } from "react";
import { X, Upload, FileText, Check, AlertCircle, Download } from "lucide-react";
import { useStore } from "@/store/StoreContext";
import { CSV_SAMPLE } from "@/data/seed";
import { toast } from "sonner";

const STEPS = ["Upload", "Map & Validate", "Preview", "Commit"];

const REQUIRED = ["sku", "title", "brand", "category", "mrp", "cost", "stock"];
const OPTIONAL = ["weight_kg", "image_url_1", "image_url_2", "image_url_3", "image_url_4", "image_url_5", "image_url_6"];

export default function CsvImportWizard({ onClose }) {
  const { addProducts, listProductOnChannels } = useStore();
  const [step, setStep] = useState(0);
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [postAction, setPostAction] = useState("master_only");
  const [selectedChannels, setSelectedChannels] = useState(["amazon", "shopify"]);
  const fileRef = useRef(null);

  const parseCsv = (text) => {
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) return { headers: [], rows: [] };
    const hdr = lines[0].split(",").map(h => h.trim());
    const rws = lines.slice(1).map(l => {
      const cells = l.split(",").map(c => c.trim());
      const obj = {};
      hdr.forEach((h, i) => obj[h] = cells[i] || "");
      return obj;
    });
    return { headers: hdr, rows: rws };
  };

  const onFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvText(text);
      const { headers: h, rows: r } = parseCsv(text);
      setHeaders(h);
      setRows(r);
      const autoMap = {};
      [...REQUIRED, ...OPTIONAL].forEach(req => {
        const found = h.find(hh => hh.toLowerCase() === req.toLowerCase());
        if (found) autoMap[req] = found;
      });
      setMapping(autoMap);
      setStep(1);
    };
    reader.readAsText(file);
  };

  const validated = rows.map((r, idx) => {
    const errors = [];
    REQUIRED.forEach(req => {
      const src = mapping[req];
      if (!src || !r[src]) errors.push(req);
    });
    const mrpKey = mapping.mrp;
    if (mrpKey && r[mrpKey] && isNaN(parseFloat(r[mrpKey]))) errors.push("mrp_format");
    return { idx, row: r, errors };
  });
  const validCount = validated.filter(v => v.errors.length === 0).length;
  const errorCount = validated.length - validCount;

  const downloadSample = () => {
    const blob = new Blob([CSV_SAMPLE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products_sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const commit = () => {
    const FALLBACK = "https://images.pexels.com/photos/12628400/pexels-photo-12628400.jpeg?auto=compress&cs=tinysrgb&w=300";
    const newProducts = validated.filter(v => v.errors.length === 0).map((v, i) => {
      const images = ["image_url_1", "image_url_2", "image_url_3", "image_url_4", "image_url_5", "image_url_6"]
        .map(k => mapping[k] ? v.row[mapping[k]] : "")
        .filter(u => u && u.trim().length > 0);
      const primary = images[0] || FALLBACK;
      return {
        id: `mp_imp_${Date.now()}_${i}`,
        sku: v.row[mapping.sku],
        title: v.row[mapping.title],
        brand: v.row[mapping.brand],
        category: v.row[mapping.category],
        mrp: parseFloat(v.row[mapping.mrp]) || 0,
        cost: parseFloat(v.row[mapping.cost]) || 0,
        stock: parseInt(v.row[mapping.stock]) || 0,
        weight: parseFloat(mapping.weight_kg ? v.row[mapping.weight_kg] : 0) || 0,
        image: primary,
        images: images.length ? images : [FALLBACK],
        channels: [],
        status: "draft",
        stock_mode: "central",
        option_axes: [],
        updated: new Date().toISOString().slice(0, 10),
      };
    });
    addProducts(newProducts);
    if (postAction === "direct_list" && selectedChannels.length > 0) {
      newProducts.forEach(p => listProductOnChannels(p.id, selectedChannels));
      toast.success(`Imported ${newProducts.length} products & listed on ${selectedChannels.length} channels`);
    } else {
      toast.success(`Imported ${newProducts.length} products to Master`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" data-testid="csv-wizard">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col border border-[var(--border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Bulk Onboarding</div>
            <div className="font-display font-black text-lg tracking-tight mt-0.5">CSV Import Wizard</div>
          </div>
          <button data-testid="wizard-close" onClick={onClose} className="p-1.5 hover:bg-[var(--surface)] rounded-sm"><X size={16} /></button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 text-[12px] ${i === step ? "text-[var(--primary)] font-semibold" : i < step ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"}`}>
                <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold ${i === step ? "bg-[var(--primary)] text-white" : i < step ? "bg-[var(--fg)] text-white" : "border border-[var(--border)]"}`}>
                  {i < step ? <Check size={10} /> : i + 1}
                </span>
                {s}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-[var(--fg)]" : "bg-[var(--border)]"}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 0 && (
            <div>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] p-12 text-center cursor-pointer hover:border-[var(--primary)] hover:bg-[#F0F4FF] transition-colors"
                data-testid="csv-dropzone"
              >
                <Upload className="mx-auto mb-3 text-[var(--fg-muted)]" size={32} />
                <div className="font-medium mb-1">Drop your CSV here or click to browse</div>
                <div className="text-[12px] text-[var(--fg-muted)]">Max 10MB · supports .csv only</div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && onFile(e.target.files[0])} data-testid="csv-file-input" />
              </div>
              <div className="mt-6 flex items-center justify-between p-4 border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-[var(--fg-muted)]" />
                  <div>
                    <div className="text-[13px] font-medium">Not sure where to start?</div>
                    <div className="text-[11px] text-[var(--fg-muted)]">Download our sample template with the required columns.</div>
                  </div>
                </div>
                <button data-testid="download-sample" onClick={downloadSample} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white hover:bg-white/60 flex items-center gap-1.5 transition-colors">
                  <Download size={12} />Download Sample
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="text-[13px] mb-4">Match your CSV columns to the required Master Product fields. We&apos;ve auto-detected {Object.keys(mapping).length} of {REQUIRED.length}.</div>
              <div className="border border-[var(--border)]">
                <div className="px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Required fields</div>
                {REQUIRED.map(req => (
                  <div key={req} className="flex items-center gap-4 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0">
                    <div className="w-40 text-[12px] font-medium">{req} <span className="text-[var(--danger)]">*</span></div>
                    <div className="text-[var(--fg-muted)]">→</div>
                    <select
                      data-testid={`map-${req}`}
                      value={mapping[req] || ""}
                      onChange={e => setMapping(m => ({ ...m, [req]: e.target.value }))}
                      className="flex-1 border border-[var(--border)] px-2 py-1 text-[13px] outline-none"
                    >
                      <option value="">— Not mapped —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    {mapping[req] && <Check size={14} className="text-[var(--success)]" />}
                  </div>
                ))}
              </div>
              <div className="border border-[var(--border)] mt-3">
                <div className="px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Optional · Images & Weight</div>
                {OPTIONAL.map(req => (
                  <div key={req} className="flex items-center gap-4 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0">
                    <div className="w-40 text-[12px] font-medium">{req}</div>
                    <div className="text-[var(--fg-muted)]">→</div>
                    <select
                      data-testid={`map-${req}`}
                      value={mapping[req] || ""}
                      onChange={e => setMapping(m => ({ ...m, [req]: e.target.value }))}
                      className="flex-1 border border-[var(--border)] px-2 py-1 text-[13px] outline-none"
                    >
                      <option value="">— Not mapped —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    {mapping[req] && <Check size={14} className="text-[var(--success)]" />}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 border border-[var(--border)] bg-[var(--surface)] text-[12px] flex items-center gap-2">
                <AlertCircle size={13} className="text-[var(--warning)]" />
                Detected {rows.length} rows · {validCount} valid · <span className="text-[var(--danger)]">{errorCount} with errors</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="text-[13px] mb-4">Review parsed products. Rows with errors are highlighted — fix mappings in the previous step or skip them.</div>
              <div className="border border-[var(--border)] overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-[var(--surface)]">
                    <tr>
                      <th className="p-2 text-left w-8">#</th>
                      {REQUIRED.map(r => <th key={r} className="p-2 text-left uppercase text-[10px] tracking-wider text-[var(--fg-muted)]">{r}</th>)}
                      <th className="p-2 text-left w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validated.slice(0, 20).map(v => (
                      <tr key={v.idx} className={`border-t border-[var(--border)] ${v.errors.length ? "bg-[#FDECEA]" : ""}`}>
                        <td className="p-2 tabular text-[var(--fg-muted)]">{v.idx + 1}</td>
                        {REQUIRED.map(r => <td key={r} className="p-2 tabular">{v.row[mapping[r]] || <span className="text-[var(--danger)]">—</span>}</td>)}
                        <td className="p-2">{v.errors.length ? <span className="text-[11px] text-[var(--danger)]">{v.errors.length} issues</span> : <span className="text-[11px] text-[var(--success)]">Valid</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="text-[13px] mb-4">Ready to commit <b>{validCount}</b> products. Choose a post-import action:</div>
              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-4 border cursor-pointer transition-colors ${postAction === "master_only" ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`} data-testid="opt-master-only">
                  <input type="radio" checked={postAction === "master_only"} onChange={() => setPostAction("master_only")} className="mt-0.5" />
                  <div>
                    <div className="font-medium text-[13px]">Import to Master only</div>
                    <div className="text-[12px] text-[var(--fg-muted)]">Products land in Master Inventory as drafts. List to channels later.</div>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-4 border cursor-pointer transition-colors ${postAction === "direct_list" ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`} data-testid="opt-direct-list">
                  <input type="radio" checked={postAction === "direct_list"} onChange={() => setPostAction("direct_list")} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-[13px]">Import & Direct List to Channels</div>
                    <div className="text-[12px] text-[var(--fg-muted)] mb-3">Push new products straight to the selected channels.</div>
                    {postAction === "direct_list" && (
                      <div className="flex flex-wrap gap-2">
                        {["amazon", "shopify", "flipkart", "woocommerce"].map(ch => (
                          <label key={ch} className={`px-3 py-1.5 text-[12px] border cursor-pointer transition-colors ${selectedChannels.includes(ch) ? "border-[var(--fg)] bg-[var(--fg)] text-white" : "border-[var(--border)] hover:bg-white"}`}>
                            <input type="checkbox" className="hidden" checked={selectedChannels.includes(ch)} onChange={() => setSelectedChannels(p => p.includes(ch) ? p.filter(c => c !== ch) : [...p, ch])} />
                            {ch.charAt(0).toUpperCase() + ch.slice(1)}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
          <div className="text-[11px] text-[var(--fg-muted)] tabular">
            {step > 0 && `${validCount} of ${rows.length} rows valid`}
          </div>
          <div className="flex gap-2">
            {step > 0 && <button data-testid="wizard-back" onClick={() => setStep(step - 1)} className="px-3 py-1.5 text-[12px] border border-[var(--border)] bg-white hover:bg-[var(--surface-2)] transition-colors">Back</button>}
            {step < 3 && step > 0 && (
              <button data-testid="wizard-next" disabled={step === 1 && validCount === 0} onClick={() => setStep(step + 1)} className="px-3 py-1.5 text-[12px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 transition-colors">Continue</button>
            )}
            {step === 3 && (
              <button data-testid="wizard-commit" onClick={commit} className="px-3 py-1.5 text-[12px] bg-[var(--fg)] text-white hover:bg-black transition-colors">Commit {validCount} Products</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
