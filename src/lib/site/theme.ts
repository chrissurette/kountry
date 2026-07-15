import type { CSSProperties } from "react";
import type { BrandConfig } from "@/types/database";

/**
 * Warm "country kitchen" default palette for the public marketing site.
 * These are only fallbacks — siteStyleVars() layers the restaurant's brand
 * profile on top, so a color set in Settings → Brand flows onto every page
 * with no code change (design rule #1). The menu's own theme pipeline
 * (src/lib/themes) is separate; this styles the surrounding site chrome.
 */
export const SITE_COLOR_DEFAULTS = {
  primary: "#7c2d12", // rich terracotta — headings, brand marks
  accent: "#b45309", // warm amber — CTAs, prices, links
  background: "#fffaf3", // warm cream
  text: "#292524", // warm near-black
} as const;

// Warm neutrals for surfaces/borders/muted text. Not part of the 5-color
// brand model, so they stay fixed regardless of brand overrides.
// muted is deliberately a touch darker than a "natural" warm grey — #78716c
// measured 4.49:1 against the default --site-bg (#fffaf3), just under WCAG
// AA's 4.5:1 for normal text; #6f6862 clears it comfortably (~5.1:1).
const FIXED = {
  surface: "#ffffff",
  muted: "#6f6862",
  border: "#ece0d1",
} as const;

/**
 * Builds the `--site-*` CSS custom properties for the marketing layout
 * wrapper: brand profile values where present, warm defaults otherwise.
 * `fonts` carries the layout's loaded default families (a display serif +
 * the app sans) so a brand font override still wins when set.
 */
export function siteStyleVars(
  brand: BrandConfig,
  fonts: { heading: string; body: string }
): CSSProperties {
  const c = brand.colors ?? {};
  return {
    "--site-primary": c.primary ?? SITE_COLOR_DEFAULTS.primary,
    "--site-accent": c.accent ?? SITE_COLOR_DEFAULTS.accent,
    "--site-bg": c.background ?? SITE_COLOR_DEFAULTS.background,
    "--site-text": c.text ?? SITE_COLOR_DEFAULTS.text,
    "--site-surface": FIXED.surface,
    "--site-muted": FIXED.muted,
    "--site-border": FIXED.border,
    "--site-font-heading": brand.fonts?.heading ?? fonts.heading,
    "--site-font-body": brand.fonts?.body ?? fonts.body,
  } as CSSProperties;
}
