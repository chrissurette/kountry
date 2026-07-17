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
 * Public site header: inline links + toggle + CTA on desktop, a hamburger
 * drawer below that. Kept client-side only for the mobile open/close state —
 * the brand name and links are passed in from the server layout that reads
 * the profile. A "Call to Order" CTA is always visible when a phone number is
 * set — until online ordering ships, the phone is the actual ordering
 * mechanism, so it needs to be one tap away on every page, not buried in the
 * nav list.
 *
 * Three responsive tiers, not two (2026-07-16, reported live: at a mid-width
 * viewport all 7 links + the logo + the EN/ES toggle + the CTA were forced
 * into one row — the logo wrapped to 2 lines and the CTA button visibly
 * broke/wrapped). Same crowding class of bug admin-nav hit earlier with far
 * fewer items (see its own dated note) — same fix, raise the hamburger
 * threshold so there's real room before anything goes inline.
 *   - >=1360px: full inline layout (logo | centered links | toggle+CTA).
 *   - <1360px down to 460px: hamburger for the link list only; the EN/ES
 *     toggle and CTA stay in the top bar next to the hamburger icon — the
 *     phone-order CTA is too important to bury on an ordinary phone.
 *   - <460px ("potentially very thin"): the toggle and CTA also move into the
 *     drawer, so the top bar is just the logo + hamburger.
 *
 * That inline threshold has moved a few times now. First twice because the
 * link set grew: sm (640px) -> lg (1024px) at 7 links, then lg -> xl (1280px)
 * on 2026-07-16 when Jobs + Email/Fax List brought it to 8 (9 off-homepage,
 * where the Home link also renders). At lg the Spanish header overflowed
 * its own bar by 81px and pushed the whole page into horizontal scroll,
 * while English fit with *exactly* 0px to spare — i.e. English alone would
 * have shipped this bug invisibly, and even "fitting" was one label away
 * from breaking. Measured live, both locales, at the boundary.
 *
 * **Then xl -> 1360px on 2026-07-16, same day, owner's explicit preference
 * call rather than a measured overflow** — the inline layout at exactly-xl
 * widths (~1280px, real laptop territory) read as cramped even though it
 * technically fit, so the hamburger now persists a bit further up before
 * switching. A deliberately small +80px nudge past the xl breakpoint (not
 * the next full Tailwind tier, 2xl/1536px — an earlier pass jumped there,
 * which the owner asked to walk back as too big a change for what was meant
 * to be "a little bit larger"), hence the arbitrary `min-[1360px]:` variant
 * instead of a named breakpoint. This was about how it *looks*, not whether
 * it *fits* — don't move it back down just because xl "measures fine".
 * (A same-day attempt to pin this to a specific live-observed viewport,
 * 1241px, was tried and reverted back to this 1360px value — the owner's
 * follow-up "revert that last change" undid the pin, not the earlier
 * 2xl->1360px correction.)
 *
 * 460px (not ~400px) is deliberate for the same reason: Spanish's "Llame
 * para ordenar" CTA is ~45px wider than English's "Call to Order" and pushed
 * a first pass at 430px into real overflow.
 *
 * **Re-verify BOTH locales at the 1360px boundary if this threshold, the CTA
 * copy, or the link set ever changes** — ES is the binding constraint every
 * time, and this comment's own warning is what caught the 8-link regression.
 * The CTA additionally carries shrink-0 whitespace-nowrap everywhere it
 * renders so it can never wrap mid-button, per the reported bug.
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
      <div className="flex items-center justify-between px-6 py-3 min-[1360px]:grid min-[1360px]:grid-cols-[1fr_auto_1fr] min-[1360px]:px-8">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="shrink-0 whitespace-nowrap font-site-heading text-lg font-semibold tracking-tight min-[1360px]:justify-self-start"
          style={{ color: "var(--site-primary)" }}
        >
          {name}
        </Link>

        {/* Centered nav on desktop (the auto middle column of the 3-zone grid). */}
        <nav className="hidden items-center justify-center gap-6 text-sm min-[1360px]:flex">
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

        {/* Desktop-only right cluster (>=xl) — same content as the two
            below-xl fallbacks further down, never all three at once. */}
        <div className="hidden items-center gap-3 min-[1360px]:flex min-[1360px]:justify-self-end">
          {localeSwitcher}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-block shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--site-primary)" }}
            >
              {t.callToOrder}
            </a>
          )}
        </div>

        {/* Below-xl top bar: hamburger always here; toggle+CTA join it down
            to ~460px (see the component note), below which they move into
            the drawer instead so this row never runs out of room. */}
        <div className="flex items-center gap-2 min-[1360px]:hidden">
          <div className="hidden items-center gap-2 min-[460px]:flex">
            {localeSwitcher}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-block shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--site-primary)" }}
              >
                {t.callToOrder}
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t.closeMenu : t.openMenu}
            aria-expanded={open}
            className="shrink-0"
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
          // Overlay, not in-flow (reported live: opening the drawer pushed
          // the whole page down instead of floating over it). header is
          // position:sticky, which already establishes a positioning
          // context for an absolute descendant, so this anchors right below
          // the header's own box without needing a new wrapper. Needs its
          // own opaque background + shadow since it's no longer physically
          // inside the header's painted box once positioned this way.
          //
          // right-6 + a fixed width, not inset-x-0 (reported live, 2nd
          // round): a full-width bar with only the *text* right-aligned
          // just left a big blank rectangle where the text used to start —
          // the container itself was never actually narrower. This is a
          // proper right-anchored dropdown card now, sized to its content
          // rather than stretched edge to edge; right-6 lines its edge up
          // with the hamburger button's own edge (matches the top bar's
          // own px-6).
          className="absolute right-6 top-full z-20 flex w-64 max-w-[calc(100vw-3rem)] max-h-[calc(100dvh-4rem)] flex-col gap-1 overflow-y-auto rounded-xl border p-2 text-sm shadow-lg min-[1360px]:hidden"
          style={{ borderColor: "var(--site-border)", background: "var(--site-bg)" }}
        >
          {/* text-right, not the flex-col default of left: the hamburger
              trigger and every top-bar element (toggle, CTA) live on the
              right, so a left-hugging drawer list read as misaligned with
              its own trigger (reported live via annotated screenshot).
              Rows stay full-width (no items-end) so the tap target is still
              the whole row, not just the shrunk label text. */}
          {!isHome && (
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-right transition-colors hover:bg-black/5"
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
              className="rounded-md px-2 py-2 text-right transition-colors hover:bg-black/5"
              style={{ color: "var(--site-text)" }}
            >
              {l.label}
            </Link>
          ))}

          {/* Very-thin fallback: only rendered here (not the top bar) below
              ~400px, so the toggle+CTA live in exactly one place at a time. */}
          <div className="mt-2 flex justify-center min-[460px]:hidden">{localeSwitcher}</div>
          {phone && (
            <a
              href={`tel:${phone}`}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md px-3 py-2 text-center font-semibold text-white min-[460px]:hidden"
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
