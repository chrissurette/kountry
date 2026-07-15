import type { BrandConfig } from "@/types/database";

/**
 * The theming pipeline for Daily Specials snapshots (docs/06): restaurant
 * brand + per-menu style overrides resolve to CSS variables. Today its only
 * renderer is History's live preview (src/app/admin/history/history-list.tsx,
 * via ThemeRenderer) — the public site has its own separate, simpler design
 * system (src/lib/site/theme.ts) since the widget/hosted-page consumers that
 * used to share this pipeline were retired.
 */
const DEFAULTS = {
  colors: {
    primary: "#171717",
    secondary: "#525252",
    accent: "#b45309",
    background: "#ffffff",
    text: "#171717",
  },
  fonts: {
    heading: "Georgia, 'Times New Roman', serif",
    body: "system-ui, -apple-system, sans-serif",
  },
} as const;

export function resolveDesignTokens(brand: BrandConfig, styleOverrides?: Partial<BrandConfig>) {
  return {
    colors: { ...DEFAULTS.colors, ...brand.colors, ...styleOverrides?.colors },
    fonts: { ...DEFAULTS.fonts, ...brand.fonts, ...styleOverrides?.fonts },
  };
}

export type DesignTokens = ReturnType<typeof resolveDesignTokens>;

/** CSS custom properties, usable as an inline `style` object in React (History's live preview is the only current renderer). */
export function tokensToCssVariables(tokens: DesignTokens): Record<string, string> {
  return {
    "--mma-color-primary": tokens.colors.primary,
    "--mma-color-secondary": tokens.colors.secondary,
    "--mma-color-accent": tokens.colors.accent,
    "--mma-color-background": tokens.colors.background,
    "--mma-color-text": tokens.colors.text,
    "--mma-font-heading": tokens.fonts.heading,
    "--mma-font-body": tokens.fonts.body,
  };
}
