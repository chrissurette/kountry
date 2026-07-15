import { LOCALE_COOKIE, type Locale } from "./locale";

/**
 * Client-only cookie write, factored out of SiteNav's component body —
 * eslint's react-hooks/immutability rule (React Compiler) flags a direct
 * `document.cookie = ...` assignment inside a component as mutating
 * something "outside the component," even from an event handler. A plain
 * module-level function sidesteps that false positive.
 */
export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
