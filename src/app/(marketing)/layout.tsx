import type { CSSProperties } from "react";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import { getSiteRestaurant } from "@/lib/site/restaurant";
import { siteStyleVars } from "@/lib/site/theme";
import { socialLinks, directionsUrl } from "@/lib/site/social";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { SiteNav, type NavLink } from "./site-nav";

// Warm display serif for headings — the default; a brand.fonts.heading value
// still overrides it (see siteStyleVars).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

function navLinks(t: ReturnType<typeof getDictionary>["nav"]): NavLink[] {
  return [
    { href: "/menu", label: t.menu },
    { href: "/order", label: t.order },
    { href: "/about", label: t.about },
    { href: "/visit", label: t.visit },
    { href: "/gallery", label: t.gallery },
    { href: "/catering", label: t.catering },
  ];
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: (
    <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.4a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8zm0 10.6a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4zm6.6-10.9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
  ),
  facebook: (
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" />
  ),
  twitter: (
    <path d="M17.5 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.1 21H2l7.3-8.3L2 3h6.4l4.4 5.9L17.5 3zm-1.1 16.1h1.7L7.7 4.8H5.9l10.5 14.3z" />
  ),
  tiktok: (
    <path d="M16.5 2c.3 2.3 1.6 3.7 3.8 3.9v2.6c-1.3.1-2.5-.3-3.8-1v6.3c0 4-2.9 6.4-6.2 5.9-3-.4-4.6-3-4.2-5.6.4-2.5 2.6-4.3 5.2-4v2.7c-.4-.1-.9-.2-1.4-.1-1.2.2-2 1.1-1.9 2.3.1 1.2 1.1 2 2.3 1.9 1.3-.1 2-1.1 2-2.6V2h2.2z" />
  ),
};

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const name = restaurant?.name ?? "Our Restaurant";
  const style = siteStyleVars(restaurant?.brand ?? {}, {
    heading: `var(--font-fraunces), Georgia, "Times New Roman", serif`,
    body: `var(--font-geist-sans), system-ui, sans-serif`,
  });

  const socials = socialLinks(restaurant?.social);
  const links = navLinks(t.nav);

  return (
    <div
      className={`${fraunces.variable} font-site-body flex min-h-dvh flex-col`}
      style={{ ...(style as CSSProperties), background: "var(--site-bg)", color: "var(--site-text)" }}
    >
      <SiteNav name={name} links={links} phone={restaurant?.phone} locale={locale} />

      <div className="flex-1">{children}</div>

      <footer className="mt-16 border-t" style={{ borderColor: "var(--site-border)" }}>
        {/* Below lg: unchanged 3-column stack (nav links and the legal line
            each need their own vertical stack to stay readable at that
            width). At lg+ there's ample horizontal room, so the 6 nav links
            and the copyright/legal/admin line each collapse onto one row
            instead of stacking 6-high and 3-high — the footer's height was
            being driven entirely by those two stacks, not by the (already
            compact) brand column. lg:items-center vertically centers the
            now-similar-height columns instead of top-aligning them. */}
        <div className="grid gap-8 px-6 py-12 sm:grid-cols-3 sm:px-8 lg:items-center lg:py-8">
          <div>
            <p className="font-site-heading text-lg font-semibold" style={{ color: "var(--site-primary)" }}>
              {name}
            </p>
            {restaurant?.address && (
              <a
                href={directionsUrl(restaurant.address)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-sm hover:underline"
                style={{ color: "var(--site-muted)" }}
              >
                {restaurant.address}
              </a>
            )}
            {restaurant?.phone && (
              <a href={`tel:${restaurant.phone}`} className="mt-1 block text-sm hover:underline" style={{ color: "var(--site-muted)" }}>
                {restaurant.phone}
              </a>
            )}
          </div>

          <nav className="flex flex-col gap-2 text-sm lg:flex-row lg:flex-wrap lg:justify-center lg:gap-x-5 lg:gap-y-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:underline" style={{ color: "var(--site-text)" }}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="sm:text-right">
            {socials.length > 0 && (
              <div className="flex gap-3 sm:justify-end">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="transition-opacity hover:opacity-70"
                    style={{ color: "var(--site-primary)" }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      {SOCIAL_ICONS[s.key]}
                    </svg>
                  </a>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-1 text-xs sm:items-end lg:mt-3 lg:flex-row lg:items-center lg:gap-3">
              <p style={{ color: "var(--site-muted)" }}>© {name}</p>
              <div className="flex gap-3">
                <Link href="/privacy" className="hover:underline" style={{ color: "var(--site-muted)" }}>
                  {t.nav.privacy}
                </Link>
                <Link href="/terms" className="hover:underline" style={{ color: "var(--site-muted)" }}>
                  {t.nav.terms}
                </Link>
              </div>
              <Link href="/admin" className="hover:underline" style={{ color: "var(--site-muted)" }}>
                {t.nav.staffSignIn}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
