import React, { useRef, useState } from "react";
import { Upload, X, Star, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const MAX_IMAGES = 6;
export const MAX_SIZE_MB = 5;

// Drag-drop image uploader. Stores base64 strings client-side (prototype).
// In production replace `onSelect` handler with a real upload flow (see ProductionGuide).
export default function ImageUploader({ value = [], onChange, max = MAX_IMAGES }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const readFile = (file) => new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error(`${file.name} is not an image`));
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      reject(new Error(`${file.name} exceeds ${MAX_SIZE_MB}MB`));
      return;
    }
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });

  const addFiles = async (fileList) => {
    const files = Array.from(fileList).slice(0, max - value.length);
    if (files.length === 0) {
      toast.warning(`Maximum ${max} images per product`);
      return;
    }
    try {
      const results = await Promise.all(files.map(readFile));
      onChange([...value, ...results]);
      toast.success(`${results.length} image${results.length !== 1 ? "s" : ""} added`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const removeAt = (idx) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };

  const setPrimary = (idx) => {
    if (idx === 0) return;
    const next = [value[idx], ...value.filter((_, i) => i !== idx)];
    onChange(next);
    toast.success("Primary image updated");
  };

  const canAdd = value.length < max;

  return (
    <div data-testid="image-uploader">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (canAdd) addFiles(e.dataTransfer.files); }}
        onClick={() => canAdd && inputRef.current?.click()}
        className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${canAdd ? (dragOver ? "border-[var(--primary)] bg-[#F0F4FF]" : "border-[var(--border)] hover:border-[var(--primary)]") : "border-[var(--border)] bg-[var(--surface)] cursor-not-allowed opacity-60"}`}
      >
        <Upload size={22} className="mx-auto mb-2 text-[var(--fg-muted)]" />
        <div className="text-[13px] font-medium mb-1">{canAdd ? "Drop images or click to browse" : `Maximum ${max} images reached`}</div>
        <div className="text-[11px] text-[var(--fg-muted)]">
          PNG, JPG, WEBP · up to {MAX_SIZE_MB}MB each · {value.length}/{max} uploaded
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          data-testid="image-file-input"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-6 gap-2 mt-3" data-testid="uploader-preview">
          {value.map((src, i) => (
            <div key={i} className="relative aspect-square border border-[var(--border)] overflow-hidden group" data-testid={`preview-${i}`}>
              <img src={src} alt="" className="w-full h-full object-cover" />
              {i === 0 && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[var(--primary)] text-white text-[9px] font-medium uppercase tracking-widest flex items-center gap-0.5">
                  <Star size={8} className="fill-current" />Primary
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                {i !== 0 && (
                  <button data-testid={`preview-primary-${i}`} onClick={e => { e.stopPropagation(); setPrimary(i); }} className="px-2 py-0.5 text-[10px] bg-white/95 text-black hover:bg-white flex items-center gap-0.5">
                    <Star size={9} />Set primary
                  </button>
                )}
                <button data-testid={`preview-remove-${i}`} onClick={e => { e.stopPropagation(); removeAt(i); }} className="px-2 py-0.5 text-[10px] bg-[var(--danger)] text-white hover:bg-red-800 flex items-center gap-0.5">
                  <X size={9} />Remove
                </button>
              </div>
            </div>
          ))}
          {Array.from({ length: max - value.length }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--fg-muted)]">
              <ImageIcon size={14} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-start gap-2 p-2.5 border border-[var(--border)] bg-[var(--surface)] text-[11px] text-[var(--fg-muted)]">
        <AlertTriangle size={12} className="text-[var(--warning)] mt-0.5 shrink-0" />
        <span>Prototype mode: images stored as base64 in browser memory. For production wiring, see the <b>Production Guide</b> button in the New Product modal.</span>
      </div>
    </div>
  );
}
