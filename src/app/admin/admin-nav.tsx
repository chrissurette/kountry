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
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0 text-base font-semibold hover:underline" title={t.viewPublicSite}>
          {restaurantName}
        </Link>

        {/* Desktop: inline nav (≥lg — 7 items incl. Sign out need the room; tablets/phones use the drawer) */}
        <nav className="hidden items-center gap-0.5 lg:flex">
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
              <button
                type="submit"
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                {t.signOut}
              </button>
            </form>
          </div>
        </nav>

        {/* Mobile: locale switcher + hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
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

      {/* Mobile: drawer */}
      {open && (
        <nav className="flex flex-col gap-0.5 border-t border-neutral-200 bg-white px-3 py-2 lg:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(link.href) ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <form action={signOut} className="mt-1 border-t border-neutral-200 pt-2">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              {t.signOut}
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
