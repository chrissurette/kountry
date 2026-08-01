import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Fraunces, Montserrat } from "next/font/google";
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

// Geometric sans used only for the compact header wordmark so its letterforms
// echo the restaurant's supplied logo without turning the logo itself into a
// tiny, unreadable image in the navigation bar.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-montserrat",
  display: "swap",
});

// One array drives BOTH the header (SiteNav) and the footer nav below —
// adding a page here puts it in both, which is the intent. Jobs and
// Email/Fax List sit last as secondary/utility pages, after the five that
// speak to someone deciding where to eat.
function navLinks(t: ReturnType<typeof getDictionary>["nav"]): NavLink[] {
  return [
    { href: "/menu", label: t.menu },
    { href: "/about", label: t.about },
    { href: "/visit", label: t.visit },
    { href: "/gallery", label: t.gallery },
    { href: "/catering", label: t.catering },
    { href: "/jobs", label: t.jobs },
    { href: "/email-fax-list", label: t.emailFaxList },
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
      className={`${fraunces.variable} ${montserrat.variable} font-site-body flex min-h-dvh flex-col`}
      style={{ ...(style as CSSProperties), background: "var(--site-bg)", color: "var(--site-text)" }}
    >
      <SiteNav name={name} links={links} phone={restaurant?.phone} locale={locale} />

      <div className="flex-1">{children}</div>

      <footer className="mt-16 border-t" style={{ borderColor: "var(--site-border)" }}>
        {/* Below sm the three footer sections stack; the page links themselves
            use a compact two-column grid. At sm+ the sections become three
            columns and the nav returns to its centered wrapping row. At lg+
            the copyright/legal/admin line also collapses onto one row. */}
        <div className="grid gap-8 px-6 py-12 text-center sm:grid-cols-3 sm:px-8 sm:text-left lg:items-center lg:py-8">
          <div>
            <p className="font-site-heading text-lg font-semibold" style={{ color: "var(--site-primary)" }}>
              {name}
            </p>
            {restaurant?.address && (
              <a
                href={directionsUrl(restaurant.address)}
                target="_blank"
                rel="noreferrer"
                className="footer-sweep-link mx-auto mt-2 block text-sm sm:mx-0"
                style={{ color: "var(--site-muted)" }}
              >
                {restaurant.address}
              </a>
            )}
            {restaurant?.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="footer-sweep-link mx-auto mt-1 block text-sm sm:mx-0"
                style={{ color: "var(--site-muted)" }}
              >
                {restaurant.phone}
              </a>
            )}
          </div>

          {/* On phones, the final utility link spans both columns so its
              longer Spanish label remains on one line at 280px. */}
          <nav className="grid grid-cols-2 justify-items-center gap-x-6 gap-y-2 text-sm sm:flex sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-1">
            {links.map((l, index) => (
              <Link
                key={l.href}
                href={l.href}
                className={`footer-sweep-link ${index === links.length - 1 ? "col-span-2 justify-self-center sm:col-span-1 sm:justify-self-auto" : ""}`}
                style={{ color: "var(--site-text)" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="text-center sm:text-right">
            {socials.length > 0 && (
              <div className="flex justify-center gap-3 sm:justify-end">
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
            <div className="mt-4 flex flex-col items-center gap-1 text-xs sm:mt-3 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
              <p style={{ color: "var(--site-muted)" }}>© {name}</p>
              <div className="flex gap-3">
                <Link href="/privacy" className="footer-sweep-link" style={{ color: "var(--site-muted)" }}>
                  {t.nav.privacy}
                </Link>
                <Link href="/terms" className="footer-sweep-link" style={{ color: "var(--site-muted)" }}>
                  {t.nav.terms}
                </Link>
              </div>
              <Link href="/admin" className="footer-sweep-link" style={{ color: "var(--site-muted)" }}>
                {t.nav.staffSignIn}
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: "var(--site-border)" }}>
          <a
            href="https://naplesestatejewelry.co"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative isolate block h-[90px] overflow-hidden bg-[#07100d] focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
            style={{ outlineColor: "var(--site-accent)" }}
          >
            <Image
              src="/partners/naples-estate-jewelry-banner.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-[68%_center] opacity-75 transition-transform duration-700 ease-out group-hover:scale-[1.025] sm:object-center sm:opacity-85"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(4, 12, 9, 0.98) 0%, rgba(4, 12, 9, 0.9) 38%, rgba(4, 12, 9, 0.42) 70%, rgba(4, 12, 9, 0.16) 100%)",
              }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-2 border border-white/20"
              style={{ boxShadow: "inset 0 0 0 1px rgba(212, 175, 55, 0.16)" }}
            />

            <span className="relative z-10 mx-auto flex h-[90px] max-w-7xl items-center justify-center px-4 sm:px-10 lg:px-16">
              <span className="flex w-full max-w-full items-center justify-center text-center text-white sm:w-auto sm:gap-8 sm:text-left">
                <span className="min-w-0">
                  <span className="mb-1 hidden items-center gap-2 text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-[#e7c871] sm:flex">
                    <span aria-hidden="true" className="h-px w-6 bg-[#e7c871]/60" />
                    {t.common.partnerAd.eyebrow}
                  </span>
                  <span className="font-site-heading block whitespace-nowrap text-lg font-semibold leading-tight tracking-tight text-white sm:text-xl">
                    {t.common.partnerAd.name}
                  </span>
                  <span className="mt-0.5 block whitespace-nowrap text-[clamp(0.48rem,2.8vw,0.68rem)] leading-snug text-white/75 sm:text-xs">
                    {t.common.partnerAd.message}
                  </span>
                </span>
                <span className="hidden shrink-0 items-center gap-2 border-b border-[#e7c871]/45 pb-0.5 text-sm font-medium text-[#f2dda0] transition-colors group-hover:border-[#e7c871] group-hover:text-white sm:inline-flex">
                  <span className="hidden sm:inline">{t.common.partnerAd.cta}</span>
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                    ↗
                  </span>
                </span>
              </span>
            </span>
          </a>
        </div>

        <a
          href="https://surettesystems.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-6 items-center justify-center whitespace-nowrap border-t px-3 text-[10px] leading-none tracking-[0.04em] transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
          style={{
            background: "var(--site-bg)",
            borderColor: "var(--site-border)",
            color: "var(--site-muted)",
            outlineColor: "var(--site-accent)",
          }}
        >
          This website built by Surette Systems
        </a>
      </footer>
    </div>
  );
}
