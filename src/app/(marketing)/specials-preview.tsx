"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";

/**
 * Hero-side "peek" at today's specials: a compact card (sized like the hero
 * photo slot it competes with — see page.tsx's rightSlot priority) that
 * expands into the full-size AI-generated special image on click, so a
 * visitor can see everything without leaving the homepage. Daily Specials
 * are always an AI-generated image now (docs/05), not structured text — see
 * CLAUDE.md's "Daily Specials image pipeline" note. "View Full Menu" still
 * links to /menu for the complete Main Menu + Specials page.
 */
export function SpecialsPreview({
  restaurantName,
  imageUrl,
  locale = "en",
}: {
  restaurantName: string;
  imageUrl: string | null;
  locale?: Locale;
}) {
  const [open, setOpen] = useState(false);
  const hasSpecials = !!imageUrl;
  const t = getDictionary(locale).specialsPreview;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 lg:mx-0">
      <button
        type="button"
        onClick={() => hasSpecials && setOpen(true)}
        aria-haspopup={hasSpecials ? "dialog" : undefined}
        disabled={!hasSpecials}
        className="group relative aspect-[4/3] w-full overflow-hidden rounded-3xl border text-left shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-default lg:aspect-square"
        style={{ borderColor: "var(--site-border)", background: "var(--site-surface)" }}
      >
        {hasSpecials ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL, not a local/optimizable asset */}
            <img src={imageUrl} alt={`${restaurantName} — ${t.todaysSpecials}`} className="h-full w-full object-cover" />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-10 h-10"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }}
              aria-hidden
            />
          </>
        ) : (
          <div className="flex h-full flex-col p-5 pb-14">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--site-accent)" }}>
              {t.todaysSpecials}
            </p>
            <p className="mt-3 flex-1 text-sm" style={{ color: "var(--site-muted)" }}>
              {t.freshDaily}
            </p>
          </div>
        )}

        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white"
          style={{ background: "var(--site-primary)" }}
        >
          {t.viewTodaysSpecials}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="transition-transform group-hover:translate-x-0.5"
            aria-hidden
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      </button>

      <Link
        href="/menu"
        className="rounded-full border px-6 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
        style={{
          borderColor: "var(--site-border)",
          color: "var(--site-primary)",
          background: "color-mix(in srgb, var(--site-primary) 10%, var(--site-surface))",
        }}
      >
        {t.viewFullMenu}
      </Link>

      {open &&
        hasSpecials &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${restaurantName} — ${t.todaysSpecials}`}
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
          >
            <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-hidden />
            <div className="relative flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-none shadow-2xl sm:max-h-[94vh] sm:rounded-3xl" style={{ background: "var(--site-surface)" }}>
              <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--site-border)" }}>
                <h2 className="font-site-heading text-xl font-bold" style={{ color: "var(--site-primary)" }}>
                  {t.todaysSpecials}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={getDictionary(locale).common.close}
                  className="rounded-full p-1.5 transition-colors hover:bg-black/5"
                  style={{ color: "var(--site-muted)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-0 sm:px-6 sm:py-5">
                {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL, not a local/optimizable asset */}
                <img src={imageUrl} alt={`${restaurantName} — ${t.todaysSpecials}`} className="w-full rounded-none sm:rounded-lg" />
              </div>

              <div className="border-t px-6 py-4 text-center" style={{ borderColor: "var(--site-border)" }}>
                <Link href="/menu" className="text-sm font-semibold hover:underline" style={{ color: "var(--site-accent)" }}>
                  {t.seeFullMenu}
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
