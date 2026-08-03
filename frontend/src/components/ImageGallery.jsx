import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2, Image as ImageIcon } from "lucide-react";

// Reusable image gallery with grid, main-view, and lightbox
export default function ImageGallery({ images = [], title = "", primaryImage, size = "md" }) {
  const list = images.length ? images : (primaryImage ? [primaryImage] : []);
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (list.length === 0) {
    return (
      <div className="border border-dashed border-[var(--border)] p-8 text-center text-[12px] text-[var(--fg-muted)]" data-testid="gallery-empty">
        <ImageIcon size={22} className="mx-auto mb-2 text-[var(--fg-muted)]" />
        No images uploaded yet
      </div>
    );
  }

  const prev = () => setIdx(i => (i - 1 + list.length) % list.length);
  const next = () => setIdx(i => (i + 1) % list.length);

  const mainH = size === "lg" ? "h-80" : size === "sm" ? "h-40" : "h-64";

  return (
    <div data-testid="image-gallery">
      <div className={`relative border border-[var(--border)] bg-[var(--surface)] ${mainH} flex items-center justify-center overflow-hidden`}>
        <img src={list[idx]} alt={title} className="w-full h-full object-contain" />
        {list.length > 1 && (
          <>
            <button data-testid="gal-prev" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white border border-[var(--border)] hover:bg-[var(--surface-2)]"><ChevronLeft size={14} /></button>
            <button data-testid="gal-next" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white border border-[var(--border)] hover:bg-[var(--surface-2)]"><ChevronRight size={14} /></button>
          </>
        )}
        <button data-testid="gal-expand" onClick={() => setLightbox(true)} className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/90 border border-[var(--border)] hover:bg-white"><Maximize2 size={12} /></button>
        <div className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-medium bg-black/70 text-white tabular">{idx + 1} / {list.length}</div>
      </div>

      {list.length > 1 && (
        <div className="grid grid-cols-6 gap-1 mt-1.5" data-testid="gal-thumbs">
          {list.map((src, i) => (
            <button
              key={i}
              data-testid={`gal-thumb-${i}`}
              onClick={() => setIdx(i)}
              className={`aspect-square border overflow-hidden transition-colors ${i === idx ? "border-[var(--primary)]" : "border-[var(--border)] hover:border-[var(--fg-muted)]"}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)} data-testid="gal-lightbox">
          <button className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-white/10 text-white hover:bg-white/20"><X size={16} /></button>
          {list.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev(); }} className="absolute left-6 w-10 h-10 flex items-center justify-center bg-white/10 text-white hover:bg-white/20"><ChevronLeft size={18} /></button>
              <button onClick={e => { e.stopPropagation(); next(); }} className="absolute right-6 w-10 h-10 flex items-center justify-center bg-white/10 text-white hover:bg-white/20"><ChevronRight size={18} /></button>
            </>
          )}
          <img src={list[idx]} alt={title} className="max-w-[90vw] max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-[12px] tabular">{idx + 1} / {list.length}</div>
        </div>
      )}
    </div>
  );
}
