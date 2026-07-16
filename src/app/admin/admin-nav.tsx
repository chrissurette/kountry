"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "./sign-out-action";
import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { setLocaleCookie } from "@/lib/i18n/set-locale-cookie";

const LOCALE_LABEL: Record<Locale, string> = { en: "EN", es: "ES" };

// The admin shell's header. The full inline nav shows at `lg` and up (7 items
// incl. Sign out need the room — below lg they'd wrap/cram, so tablets and
// phones get the hamburger drawer instead). The active page is highlighted so
// staff always know where they are. `employee: true` links are the only ones an
// employee sees — everything else is owner-only (enforced in the middleware).
// The EN/ES pill is the same site_locale cookie toggle as the public site's
// SiteNav (docs/06) — an employee working the Daily Special generator in
// Spanish is the reason this exists (owner-only screens like Settings/Main
// Menu/History/Site Photos still redirect employees regardless of locale).
function navLinks(t: ReturnType<typeof getDictionary>["admin"]["nav"]) {
  return [
    { href: "/admin/menus/new", label: t.newDailySpecial, employee: true },
    { href: "/admin/main-menu", label: t.mainMenu, employee: false },
    { href: "/admin/history", label: t.history, employee: false },
    { href: "/admin/library", label: t.library, employee: false },
    { href: "/admin/site", label: t.sitePhotos, employee: false },
    { href: "/admin/subscribers", label: t.subscribers, employee: false },
    { href: "/admin/email-fax-list", label: t.emailFaxList, employee: false },
    { href: "/admin/settings", label: t.settings, employee: false },
  ];
}

export function AdminNav({
  restaurantName,
  role,
  locale,
}: {
  restaurantName: string;
  role: "owner" | "employee";
  locale: Locale;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const t = getDictionary(locale).admin.nav;

  const links = (role === "employee" ? navLinks(t).filter((l) => l.employee) : navLinks(t));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  function switchLocale(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    setOpen(false);
    router.refresh();
  }

  const localeSwitcher = (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-neutral-300 p-0.5 text-xs font-semibold" role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchLocale(l)}
          aria-pressed={l === locale}
          className="rounded px-2 py-1 transition-colors"
          style={{ background: l === locale ? "#171717" : "transparent", color: l === locale ? "#fff" : "#525252" }}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
      {/* xl:max-w-none is load-bearing, not cosmetic: the inline nav's ES
          labels need ~1230px of row, so inside the old max-w-5xl (1024px)
          cap the bar overflowed at EVERY viewport width — raising the
          breakpoint alone fixed nothing (measured: 174px overflow at 1280
          before this). Uncapping at xl means it *just* fits at the 1280
          boundary (12px of slack in ES — normal for a breakpoint edge) and
          gains real margin as the window widens; a fixed 7xl cap was tried
          first and rejected because it froze that 12px as the permanent
          maximum at every width. Re-measure BOTH locales at 1280 if a nav
          label or item is ever added — ES is the binding constraint. */}
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 xl:max-w-none">
        <Link href="/" className="shrink-0 text-base font-semibold hover:underline" title={t.viewPublicSite}>
          {restaurantName}
        </Link>

        {/* Desktop: inline nav. ≥xl since 2026-07-16 — the Fax/Email List
            link made it 8 items + Sign out, and at lg (1024px) the SPANISH
            labels overflowed the bar by a measured 189px (page-level
            horizontal scroll), while this project's history says EN-only
            checks miss exactly this. Third occurrence of the crowding bug
            (admin-nav md→lg at 7 items; SiteNav lg→xl at 8) — same fix each
            time: more room before going inline; tablets use the drawer. */}
        <nav className="hidden items-center gap-0.5 xl:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-1.5 flex items-center gap-1.5 border-l border-neutral-200 pl-1.5">
            {localeSwitcher}
            <form action={signOut}>
              {/* whitespace-nowrap like the links: without it, flex pressure
                  at the xl boundary wrapped "Cerrar sesión" to two lines and
                  stretched the whole header (measured live, ES). */}
              <button
                type="submit"
                className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                {t.signOut}
              </button>
            </form>
          </div>
        </nav>

        {/* Mobile/tablet: locale switcher + hamburger */}
        <div className="flex items-center gap-2 xl:hidden">
          {localeSwitcher}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-700"
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile: drawer — a compact right-anchored dropdown card that floats
          over the page, NOT a full-width in-flow bar. Same three properties
          the public SiteNav's drawer landed on (see its own dated note in
          CLAUDE.md; this is the owner's stated general rule for every dropdown
          menu in the app):
            1. text-right on every row — the trigger, the locale pill, and
               everything else in the top bar live on the right, so a
               left-hugging list reads as misaligned with its own trigger.
            2. right-anchored + fixed width, so there's no dead blank space to
               the left of a narrow text column. right-4/sm:right-6 matches
               the header's own px-4/sm:px-6, lining the card's edge up with
               the hamburger button.
            3. absolute (header is sticky = a positioning context), so opening
               it floats over the page instead of pushing every element down.
               Needs its own bg/shadow once it's out of the header's box. */}
      {open && (
        <nav className="absolute right-4 top-full z-20 flex max-h-[calc(100dvh-4rem)] w-56 max-w-[calc(100vw-2rem)] flex-col gap-0.5 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2 shadow-lg sm:right-6 xl:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`rounded-md px-3 py-2.5 text-right text-sm font-medium transition-colors ${
                isActive(link.href) ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <form action={signOut} className="mt-1 border-t border-neutral-200 pt-2">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2.5 text-right text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              {t.signOut}
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
