"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { setLocaleCookie } from "@/lib/i18n/set-locale-cookie";

export interface NavLink {
  href: string;
  label: string;
}

const LOCALE_LABEL: Record<Locale, string> = { en: "EN", es: "ES" };

/**
 * Public site header: inline links on desktop, a toggle menu on mobile. Kept
 * client-side only for the mobile open/close state — the brand name and links
 * are passed in from the server layout that reads the profile. A "Call to
 * Order" CTA is always visible when a phone number is set — until online
 * ordering ships, the phone is the actual ordering mechanism, so it needs to
 * be one tap away on every page, not buried in the nav list.
 *
 * The EN/ES pill is the language toggle (step 1 of the site-wide Spanish
 * translation): it writes a plain preference cookie and refreshes the route
 * so every server-rendered page re-reads it (src/lib/i18n/locale.ts).
 */
export function SiteNav({
  name,
  links,
  phone,
  locale,
}: {
  name: string;
  links: NavLink[];
  phone?: string | null;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const t = getDictionary(locale).nav;

  function switchLocale(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    setOpen(false);
    router.refresh();
  }

  const localeSwitcher = (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border p-0.5 text-xs font-semibold"
      style={{ borderColor: "var(--site-border)" }}
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchLocale(l)}
          aria-pressed={l === locale}
          className="rounded-full px-2.5 py-1 transition-colors"
          style={{
            background: l === locale ? "var(--site-primary)" : "transparent",
            color: l === locale ? "#fff" : "var(--site-text)",
          }}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{
        borderColor: "var(--site-border)",
        background: "color-mix(in srgb, var(--site-bg) 88%, transparent)",
      }}
    >
      <div className="flex items-center justify-between px-6 py-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-8">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="font-site-heading text-lg font-semibold tracking-tight sm:justify-self-start"
          style={{ color: "var(--site-primary)" }}
        >
          {name}
        </Link>

        {/* Centered nav on desktop (the auto middle column of the 3-zone grid). */}
        <nav className="hidden items-center justify-center gap-6 text-sm sm:flex">
          {!isHome && (
            <Link
              href="/"
              className="pb-0.5 font-medium transition hover:opacity-70"
              style={{ color: "var(--site-text)", boxShadow: "inset 0 -2px 0 0 transparent" }}
            >
              {t.home}
            </Link>
          )}
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                // A fixed font-weight + box-shadow underline (not border, not
                // font-weight) marks the active page — box-shadow paints
                // color only and never occupies layout space, so the active
                // link never changes width and its neighbors never shift as
                // you navigate between pages.
                className="pb-0.5 font-medium transition hover:opacity-70"
                style={{
                  color: active ? "var(--site-primary)" : "var(--site-text)",
                  boxShadow: `inset 0 -2px 0 0 ${active ? "var(--site-primary)" : "transparent"}`,
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 sm:flex sm:justify-self-end">
          {localeSwitcher}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-block rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--site-primary)" }}
            >
              {t.callToOrder}
            </a>
          )}
        </div>

        <div className="flex items-center gap-3 sm:hidden">
          {localeSwitcher}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t.closeMenu : t.openMenu}
            aria-expanded={open}
            style={{ color: "var(--site-primary)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="flex flex-col gap-1 border-t px-6 py-3 text-sm sm:hidden"
          style={{ borderColor: "var(--site-border)" }}
        >
          {!isHome && (
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 transition-colors hover:bg-black/5"
              style={{ color: "var(--site-text)" }}
            >
              {t.home}
            </Link>
          )}
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 transition-colors hover:bg-black/5"
              style={{ color: "var(--site-text)" }}
            >
              {l.label}
            </Link>
          ))}
          {phone && (
            <a
              href={`tel:${phone}`}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md px-3 py-2 text-center font-semibold text-white"
              style={{ background: "var(--site-primary)" }}
            >
              {t.callToOrder} — {phone}
            </a>
          )}
        </nav>
      )}
    </header>
  );
}
