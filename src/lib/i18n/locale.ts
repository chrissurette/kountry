/**
 * Site-wide locale toggle (step 1 of Spanish translation). Deliberately
 * cookie-based rather than /en, /es URL prefixes — no route restructuring,
 * no new dependency, matches docs/01's low-maintenance stance. Trade-off:
 * Spanish pages aren't independently indexable/shareable by URL yet; revisit
 * with locale-prefixed routing if Spanish-language search traffic turns out
 * to matter (plausible for Immokalee's demographics).
 *
 * Client-safe (no next/headers import) — src/lib/i18n/get-locale.ts holds
 * the server-only cookie read, so client components (like SiteNav) can
 * import the type/constants here without pulling next/headers into the
 * client bundle.
 */
export type Locale = "en" | "es";

export const LOCALES: Locale[] = ["en", "es"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "site_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "es";
}
