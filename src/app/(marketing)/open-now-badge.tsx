"use client";

import { useEffect, useState } from "react";
import type { RestaurantHours } from "@/types/database";
import { isOpenNow } from "@/lib/site/hours";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";

/**
 * Open/closed pill computed on the visitor's own clock after mount — server
 * render can't know the visitor's timezone, and computing at hydration avoids
 * a mismatch. Renders nothing until mounted (and if no hours are set).
 */
export function OpenNowBadge({
  hours,
  className = "",
  locale = "en",
}: {
  hours: RestaurantHours[];
  className?: string;
  locale?: Locale;
}) {
  const t = getDictionary(locale).common;
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hours || hours.length === 0) return;
    const compute = () => setOpen(isOpenNow(hours, new Date()));
    compute();
    const id = setInterval(compute, 60_000); // re-check each minute so it flips live
    return () => clearInterval(id);
  }, [hours]);

  if (open === null) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}
      style={{
        background: open ? "rgba(22, 101, 52, 0.1)" : "rgba(120, 113, 108, 0.12)",
        color: open ? "#166534" : "var(--site-muted)",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: open ? "#16a34a" : "var(--site-muted)" }}
      />
      {open ? t.openNow : t.closedNow}
    </span>
  );
}
