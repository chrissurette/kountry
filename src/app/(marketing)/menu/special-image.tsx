"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The published Daily Special image (an SVG) on the /menu page. Renders large
 * inline for readability, and opens a full-screen lightbox on click/tap so a
 * visitor can read every price up close — the SVG is vector, so it stays
 * crisp at any zoom.
 */
export function SpecialImage({
  src,
  alt,
  tapToEnlargeLabel = "Tap to enlarge",
}: {
  src: string;
  alt: string;
  tapToEnlargeLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border shadow-sm transition-transform hover:-translate-y-0.5"
        style={{ borderColor: "var(--site-border)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- public Storage SVG URL */}
        <img src={src} alt={alt} className="w-full" />
        <span
          className="pointer-events-none absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-semibold text-white opacity-90 shadow"
          style={{ background: "color-mix(in srgb, var(--site-primary) 88%, transparent)" }}
        >
          {tapToEnlargeLabel}
        </span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setOpen(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- public Storage SVG URL */}
            <img src={src} alt={alt} className="max-h-[95vh] max-w-[95vw] rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-neutral-800 shadow"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
