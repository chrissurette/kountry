"use client";

import { useState } from "react";

/**
 * Wraps an item's name so hovering (desktop), tapping (mobile, which has no
 * hover), or keyboard-focusing it shows a small photo popover — only
 * rendered for items that actually have an image
 * (src/lib/main-menu/item-image-service.ts). Uses a real <button> rather
 * than a clickable <span> so keyboard and screen-reader users can reach the
 * photo too, not just mouse/touch users.
 */
export function MenuItemImagePopover({ imageUrl, children }: { imageUrl: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="m-0 inline cursor-pointer border-0 bg-transparent p-0 font-inherit text-inherit underline decoration-dotted underline-offset-4"
        style={{ textDecorationColor: "var(--site-border)" }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {children}
      </button>
      {open && (
        <span
          // Anchored to the trigger's left edge rather than centered — every
          // item name in the menu list starts at the same left x (ItemRow's
          // layout always puts the name first), so this can never clip past
          // the left edge like center + translate-x(-50%) could for a short
          // name near the row's start.
          className="absolute left-0 top-full z-30 mt-2 w-36 overflow-hidden rounded-xl border shadow-lg sm:w-44"
          style={{ borderColor: "var(--site-border)", background: "var(--site-surface)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL, not a local/optimizable asset */}
          <img src={imageUrl} alt="" className="aspect-square w-full object-cover" />
        </span>
      )}
    </span>
  );
}
